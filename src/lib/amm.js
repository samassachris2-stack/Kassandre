const FEE = 0.02;

export function getPrice(poolYes, poolNo) {
  return poolNo / (poolYes + poolNo);
}

export function calcShares(poolYes, poolNo, side, amount) {
  const amountAfterFee = amount * (1 - FEE);
  const k = poolYes * poolNo;

  if (side === "yes") {
    const newPoolNo = poolNo + amountAfterFee;
    const newPoolYes = k / newPoolNo;
    const shares = poolYes - newPoolYes;
    const pricePerShare = amountAfterFee / shares;
    return { shares, newPoolYes, newPoolNo, pricePerShare };
  } else {
    const newPoolYes = poolYes + amountAfterFee;
    const newPoolNo = k / newPoolYes;
    const shares = poolNo - newPoolNo;
    const pricePerShare = amountAfterFee / shares;
    return { shares, newPoolYes, newPoolNo, pricePerShare };
  }
}

export async function placeBet(userId, marketId, side, amount) {
  const { doc, runTransaction, serverTimestamp } = await import("firebase/firestore");
  const { db } = await import("./firebase");

  const userRef = doc(db, "users", userId);
  const marketRef = doc(db, "markets", marketId);
  const betRef = doc(db, "bets", `${userId}_${marketId}_${Date.now()}`);

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const marketSnap = await tx.get(marketRef);

    if (!userSnap.exists()) throw new Error("Utilisateur introuvable");
    if (!marketSnap.exists()) throw new Error("Marché introuvable");

    const user = userSnap.data();
    const market = marketSnap.data();

    if (market.status !== "open") throw new Error("Ce marché est fermé");
    if (user.balance < amount) throw new Error("Solde insuffisant");
    if (amount <= 0) throw new Error("Montant invalide");

    const { shares, newPoolYes, newPoolNo, pricePerShare } = calcShares(
      market.poolYes,
      market.poolNo,
      side,
      amount
    );

    tx.update(userRef, {
      balance: user.balance - amount,
      totalBets: (user.totalBets || 0) + 1,
    });

    tx.update(marketRef, {
      poolYes: newPoolYes,
      poolNo: newPoolNo,
      lastUpdated: serverTimestamp(),
    });

    tx.set(betRef, {
      userId,
      marketId,
      side,
      amount,
      shares,
      priceAtBet: pricePerShare,
      createdAt: serverTimestamp(),
    });
  });
}

export async function resolveMarket(marketId, outcome) {
  const { doc, runTransaction, collection, getDocs, query, where, writeBatch, serverTimestamp } = await import("firebase/firestore");
  const { db } = await import("./firebase");

  const marketRef = doc(db, "markets", marketId);

  await runTransaction(db, async (tx) => {
    const marketSnap = await tx.get(marketRef);
    if (!marketSnap.exists()) throw new Error("Marché introuvable");
    if (marketSnap.data().status !== "open") throw new Error("Marché déjà résolu");
    tx.update(marketRef, { status: "resolved", outcome, resolvedAt: serverTimestamp() });
  });

  const betsQuery = query(
    collection(db, "bets"),
    where("marketId", "==", marketId),
    where("side", "==", outcome)
  );
  const losingBetsQuery = query(
    collection(db, "bets"),
    where("marketId", "==", marketId),
    where("side", "!=", outcome)
  );

  const [winSnap, loseSnap] = await Promise.all([getDocs(betsQuery), getDocs(losingBetsQuery)]);

  let totalWinningShares = 0;
  winSnap.forEach((b) => { totalWinningShares += b.data().shares; });

  let totalLosingAmount = 0;
  loseSnap.forEach((b) => { totalLosingAmount += b.data().amount; });

  const batch = writeBatch(db);

  winSnap.forEach((betDoc) => {
    const bet = betDoc.data();
    const ratio = bet.shares / totalWinningShares;
    const winnings = bet.amount + ratio * totalLosingAmount * 0.98;
    const userRef = doc(db, "users", bet.userId);
    batch.update(userRef, { balance: bet.amount });

    const notifRef = doc(db, "notifications", `${bet.userId}_${marketId}`);
    batch.set(notifRef, {
      userId: bet.userId,
      type: "resolved",
      marketId,
      outcome,
      payout: Math.round(winnings),
      read: false,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

export function calcSharesMulti(pool, totalPool, amount) {
  const FEE = 0.02;
  const amountAfterFee = amount * (1 - FEE);
  const k = pool * (totalPool - pool);
  const newTotalPool = totalPool + amountAfterFee;
  const newPool = k / (newTotalPool - pool) ;
  const shares = pool - newPool;
  const pricePerShare = amountAfterFee / shares;
  return { shares, newPool, newTotalPool, pricePerShare };
}

export async function placeBetMulti(userId, marketId, optionId, amount) {
  const { doc, runTransaction, serverTimestamp, collection } = await import("firebase/firestore");
  const { db } = await import("./firebase");

  const userRef = doc(db, "users", userId);
  const optionRef = doc(db, "markets", marketId, "options", optionId);
  const betRef = doc(db, "bets", `${userId}_${marketId}_${optionId}_${Date.now()}`);

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const optionSnap = await tx.get(optionRef);

    if (!userSnap.exists()) throw new Error("Utilisateur introuvable");
    if (!optionSnap.exists()) throw new Error("Option introuvable");

    const user = userSnap.data();
    const option = optionSnap.data();

    if (user.balance < amount) throw new Error("Solde insuffisant");
    if (amount <= 0) throw new Error("Montant invalide");

    const { shares, newPool, pricePerShare } = calcSharesMulti(
      option.pool,
      option.totalPool,
      amount
    );

    tx.update(userRef, {
      balance: user.balance - amount,
      totalBets: (user.totalBets || 0) + 1,
    });

    tx.update(optionRef, {
      pool: newPool,
      totalPool: option.totalPool + amount * 0.98,
      lastUpdated: serverTimestamp(),
    });

    tx.set(betRef, {
      userId,
      marketId,
      optionId,
      type: "multi",
      amount,
      shares,
      priceAtBet: pricePerShare,
      createdAt: serverTimestamp(),
    });
  });
}