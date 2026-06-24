const FEE = 0.02;

// Spread cosmétique affiché autour du prix réel du marché (achat/vente façon
// carnet d'ordres). Purement visuel : n'influence jamais poolYes/poolNo ni les
// quantités LMSR. Le prix réel du marché reste calculé par calcShares /
// calcSharesLMSR comme avant ; cette fonction sert uniquement à habiller l'UI.
const COSMETIC_SPREAD = 0.015; // ±1.5 point de pourcentage autour du prix réel

export function getBidAsk(price) {
  const ask = Math.min(0.99, price + COSMETIC_SPREAD);
  const bid = Math.max(0.01, price - COSMETIC_SPREAD);
  return { bid, ask };
}

// Liquidité par défaut pour un marché multi-choix selon son nombre d'options.
// Calibré pour qu'un pari de 50 pts déplace l'option visée d'environ 20 à 30 points
// de pourcentage, peu importe le nombre d'options (sensation "vivante" adaptée à la beta).
export function defaultLiquidityB(numOptions) {
  return Math.round(75 * Math.log(numOptions + 1));
}

export function getPrice(poolYes, poolNo) {
  return poolNo / (poolYes + poolNo);
}

export function getPricesLMSR(quantities, b) {
  const maxQ = Math.max(...quantities);
  const exps = quantities.map((q) => Math.exp((q - maxQ) / b));
  const sumExps = exps.reduce((a, v) => a + v, 0);
  return exps.map((e) => e / sumExps);
}

function lmsrCost(quantities, b) {
  const maxQ = Math.max(...quantities);
  const sumExps = quantities.reduce((acc, q) => acc + Math.exp((q - maxQ) / b), 0);
  return maxQ + b * Math.log(sumExps);
}

export function calcSharesLMSR(quantities, b, optionIndex, amount) {
  const amountAfterFee = amount * (1 - FEE);
  const costBefore = lmsrCost(quantities, b);

  let lo = 0;
  let hi = amountAfterFee * 50 + b * 10 + 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const trialQuantities = quantities.map((q, i2) => (i2 === optionIndex ? q + mid : q));
    const cost = lmsrCost(trialQuantities, b) - costBefore;
    if (cost > amountAfterFee) hi = mid;
    else lo = mid;
  }
  const deltaShares = lo;

  const newQuantities = quantities.map((q, i) => (i === optionIndex ? q + deltaShares : q));
  const pricePerShare = deltaShares > 0 ? amountAfterFee / deltaShares : 1;
  const newPrices = getPricesLMSR(newQuantities, b);

  return {
    shares: deltaShares,
    newQuantities,
    pricePerShare,
    newPrice: newPrices[optionIndex],
  };
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

// Inverse de calcShares : l'utilisateur rend des parts au pool et récupère
// des points. Même contrainte CPMM x*y=k, mais en sens inverse.
export function calcSellShares(poolYes, poolNo, side, sharesToSell) {
  const k = poolYes * poolNo;

  if (side === "yes") {
    const newPoolYes = poolYes + sharesToSell;
    const newPoolNo = k / newPoolYes;
    const grossProceeds = poolNo - newPoolNo;
    const netProceeds = grossProceeds * (1 - FEE);
    const pricePerShare = grossProceeds / sharesToSell;
    return { proceeds: netProceeds, newPoolYes, newPoolNo, pricePerShare };
  } else {
    const newPoolNo = poolNo + sharesToSell;
    const newPoolYes = k / newPoolNo;
    const grossProceeds = poolYes - newPoolYes;
    const netProceeds = grossProceeds * (1 - FEE);
    const pricePerShare = grossProceeds / sharesToSell;
    return { proceeds: netProceeds, newPoolYes, newPoolNo, pricePerShare };
  }
}

export async function placeBet(userId, marketId, side, amount) {
  const { doc, runTransaction, serverTimestamp, collection } = await import("firebase/firestore");
  const { db } = await import("./firebase");

  const userRef = doc(db, "users", userId);
  const marketRef = doc(db, "markets", marketId);
  const betRef = doc(db, "bets", `${userId}_${marketId}_${Date.now()}`);
  const positionRef = doc(db, "positions", `${userId}_${marketId}_${side}`);

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const marketSnap = await tx.get(marketRef);
    const positionSnap = await tx.get(positionRef);

    if (!userSnap.exists()) throw new Error("Utilisateur introuvable");
    if (!marketSnap.exists()) throw new Error("Marché introuvable");

    const user = userSnap.data();
    const market = marketSnap.data();

    if (market.status !== "open") throw new Error("Ce marché est fermé");
    if (user.balance < amount) throw new Error("Solde insuffisant");
    if (amount <= 0) throw new Error("Montant invalide");

    const { shares, newPoolYes, newPoolNo, pricePerShare } = calcShares(
      market.poolYes, market.poolNo, side, amount
    );

    const pctYes = Math.round((newPoolNo / (newPoolYes + newPoolNo)) * 100);
    const currentShares = positionSnap.exists() ? positionSnap.data().shares : 0;

    tx.update(userRef, {
      balance: user.balance - amount,
      totalBets: (user.totalBets || 0) + 1,
    });
    tx.update(marketRef, {
      poolYes: newPoolYes,
      poolNo: newPoolNo,
      lastUpdated: serverTimestamp(),
    });
    tx.set(positionRef, {
      userId, marketId, side,
      shares: currentShares + shares,
      lastUpdated: serverTimestamp(),
    });
    tx.set(betRef, {
      userId, marketId, side, amount, shares,
      priceAtBet: pricePerShare,
      createdAt: serverTimestamp(),
    });
    const historyRef = doc(collection(db, "markets", marketId, "priceHistory"));
    tx.set(historyRef, { pctYes, pctNo: 100 - pctYes, timestamp: serverTimestamp() });
  });
}

export async function sellShares(userId, marketId, side, sharesToSell) {
  const { doc, runTransaction, serverTimestamp, collection } = await import("firebase/firestore");
  const { db } = await import("./firebase");

  const userRef = doc(db, "users", userId);
  const marketRef = doc(db, "markets", marketId);
  const positionRef = doc(db, "positions", `${userId}_${marketId}_${side}`);
  const betRef = doc(db, "bets", `${userId}_${marketId}_${Date.now()}_sell`);

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const marketSnap = await tx.get(marketRef);
    const positionSnap = await tx.get(positionRef);

    if (!userSnap.exists()) throw new Error("Utilisateur introuvable");
    if (!marketSnap.exists()) throw new Error("Marché introuvable");
    if (!positionSnap.exists()) throw new Error("Aucune position à vendre");

    const user = userSnap.data();
    const market = marketSnap.data();
    const position = positionSnap.data();

    if (market.status !== "open") throw new Error("Ce marché est fermé");
    if (sharesToSell <= 0) throw new Error("Quantité invalide");
    if (sharesToSell > position.shares) throw new Error("Tu ne possèdes pas autant de parts");

    const { proceeds, newPoolYes, newPoolNo, pricePerShare } = calcSellShares(
      market.poolYes,
      market.poolNo,
      side,
      sharesToSell
    );

    if (newPoolYes <= 0 || newPoolNo <= 0) {
      throw new Error("Vente impossible : liquidité insuffisante dans le pool");
    }

    const pctYes = Math.round((newPoolNo / (newPoolYes + newPoolNo)) * 100);

    tx.update(userRef, {
      balance: user.balance + proceeds,
    });

    tx.update(marketRef, {
      poolYes: newPoolYes,
      poolNo: newPoolNo,
      lastUpdated: serverTimestamp(),
    });

    tx.update(positionRef, {
      shares: position.shares - sharesToSell,
      lastUpdated: serverTimestamp(),
    });

    tx.set(betRef, {
      userId,
      marketId,
      side,
      type: "sell",
      amount: -proceeds,
      shares: -sharesToSell,
      priceAtBet: pricePerShare,
      createdAt: serverTimestamp(),
    });

    const historyRef = doc(collection(db, "markets", marketId, "priceHistory"));
    tx.set(historyRef, {
      pctYes,
      pctNo: 100 - pctYes,
      timestamp: serverTimestamp(),
    });
  });
}

export async function resolveMarket(marketId, outcome) {
  const { doc, runTransaction, collection, getDocs, query, where, writeBatch, serverTimestamp } = await import("firebase/firestore");
  const { db } = await import("./firebase");

  const marketRef = doc(db, "markets", marketId);
  let marketType = "binary";

  await runTransaction(db, async (tx) => {
    const marketSnap = await tx.get(marketRef);
    if (!marketSnap.exists()) throw new Error("Marché introuvable");
    if (marketSnap.data().status !== "open") throw new Error("Marché déjà résolu");
    marketType = marketSnap.data().type === "multi" ? "multi" : "binary";
    tx.update(marketRef, { status: "resolved", outcome, resolvedAt: serverTimestamp() });
  });

  const winningField = marketType === "multi" ? "optionId" : "side";

  const betsQuery = query(
    collection(db, "bets"),
    where("marketId", "==", marketId),
    where(winningField, "==", outcome)
  );
  const losingBetsQuery = query(
    collection(db, "bets"),
    where("marketId", "==", marketId),
    where(winningField, "!=", outcome)
  );

  const [winSnap, loseSnap] = await Promise.all([getDocs(betsQuery), getDocs(losingBetsQuery)]);

  let totalWinningShares = 0;
  winSnap.forEach((b) => { totalWinningShares += b.data().shares; });

  let totalLosingAmount = 0;
  loseSnap.forEach((b) => { totalLosingAmount += b.data().amount; });

  const batch = writeBatch(db);

  winSnap.forEach((betDoc) => {
    const bet = betDoc.data();
    const ratio = totalWinningShares > 0 ? bet.shares / totalWinningShares : 0;
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

export async function placeBetMulti(userId, marketId, optionId, amount) {
  const { doc, runTransaction, serverTimestamp, collection, getDocs, query, orderBy } = await import("firebase/firestore");
  const { db } = await import("./firebase");

  const userRef = doc(db, "users", userId);
  const marketRef = doc(db, "markets", marketId);
  const betRef = doc(db, "bets", `${userId}_${marketId}_${optionId}_${Date.now()}`);
  const positionRef = doc(db, "positions", `${userId}_${marketId}_${optionId}`);

  const optionsSnap = await getDocs(query(collection(db, "markets", marketId, "options"), orderBy("createdAt", "asc")));
  const optionDocs = optionsSnap.docs;
  const optionIds = optionDocs.map((d) => d.id);
  const optionIndex = optionIds.indexOf(optionId);
  if (optionIndex === -1) throw new Error("Option introuvable");

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const marketSnap = await tx.get(marketRef);
    const positionSnap = await tx.get(positionRef);
    if (!userSnap.exists()) throw new Error("Utilisateur introuvable");
    if (!marketSnap.exists()) throw new Error("Marché introuvable");

    const user = userSnap.data();
    const market = marketSnap.data();
    if (market.status !== "open") throw new Error("Ce marché est fermé");
    if (user.balance < amount) throw new Error("Solde insuffisant");
    if (amount <= 0) throw new Error("Montant invalide");

    const optionSnaps = await Promise.all(optionDocs.map((d) => tx.get(d.ref)));
    const quantities = optionSnaps.map((s) => s.data().q || 0);
    const b = market.liquidityB || defaultLiquidityB(optionDocs.length);

    const { shares, newQuantities, pricePerShare } = calcSharesLMSR(
      quantities, b, optionIndex, amount
    );

    const currentShares = positionSnap.exists() ? positionSnap.data().shares : 0;

    tx.update(userRef, {
      balance: user.balance - amount,
      totalBets: (user.totalBets || 0) + 1,
    });

    const newPrices = getPricesLMSR(newQuantities, b);
    optionDocs.forEach((d, i) => {
      tx.update(d.ref, {
        q: newQuantities[i],
        price: newPrices[i],
        lastUpdated: serverTimestamp(),
      });
    });

    tx.set(positionRef, {
      userId,
      marketId,
      optionId,
      type: "multi",
      shares: currentShares + shares,
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

    const historyRef = doc(collection(db, "markets", marketId, "priceHistory"));
    const historyEntry = { timestamp: serverTimestamp() };
    optionIds.forEach((id, i) => { historyEntry[id] = Math.round(newPrices[i] * 100); });
    tx.set(historyRef, historyEntry);
  });
}
export function calcSellSharesLMSR(quantities, b, optionIndex, sharesToSell) {
  const costBefore = (() => {
    const maxQ = Math.max(...quantities);
    const sumExps = quantities.reduce((acc, q) => acc + Math.exp((q - maxQ) / b), 0);
    return maxQ + b * Math.log(sumExps);
  })();

  const newQuantities = quantities.map((q, i) => (i === optionIndex ? q - sharesToSell : q));

  if (newQuantities[optionIndex] < 0) throw new Error("Pas assez de parts dans le pool");

  const costAfter = (() => {
    const maxQ = Math.max(...newQuantities);
    const sumExps = newQuantities.reduce((acc, q) => acc + Math.exp((q - maxQ) / b), 0);
    return maxQ + b * Math.log(sumExps);
  })();

  const grossProceeds = costBefore - costAfter;
  const netProceeds = grossProceeds * (1 - FEE);
  const pricePerShare = grossProceeds / sharesToSell;
  const newPrices = getPricesLMSR(newQuantities, b);

  return { proceeds: netProceeds, newQuantities, pricePerShare, newPrice: newPrices[optionIndex] };
}

export async function sellSharesMulti(userId, marketId, optionId, sharesToSell) {
  const { doc, runTransaction, serverTimestamp, collection, getDocs, query, orderBy } = await import("firebase/firestore");
  const { db } = await import("./firebase");

  const userRef = doc(db, "users", userId);
  const marketRef = doc(db, "markets", marketId);
  const positionRef = doc(db, "positions", `${userId}_${marketId}_${optionId}`);
  const betRef = doc(db, "bets", `${userId}_${marketId}_${optionId}_${Date.now()}_sell`);

  const optionsSnap = await getDocs(query(collection(db, "markets", marketId, "options"), orderBy("createdAt", "asc")));
  const optionDocs = optionsSnap.docs;
  const optionIds = optionDocs.map((d) => d.id);
  const optionIndex = optionIds.indexOf(optionId);
  if (optionIndex === -1) throw new Error("Option introuvable");

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const marketSnap = await tx.get(marketRef);
    const positionSnap = await tx.get(positionRef);

    if (!userSnap.exists()) throw new Error("Utilisateur introuvable");
    if (!marketSnap.exists()) throw new Error("Marché introuvable");
    if (!positionSnap.exists()) throw new Error("Aucune position à vendre");

    const user = userSnap.data();
    const market = marketSnap.data();
    const position = positionSnap.data();

    if (market.status !== "open") throw new Error("Ce marché est fermé");
    if (sharesToSell <= 0) throw new Error("Quantité invalide");
    if (sharesToSell > position.shares) throw new Error("Tu ne possèdes pas autant de parts");

    const optionSnaps = await Promise.all(optionDocs.map((d) => tx.get(d.ref)));
    const quantities = optionSnaps.map((s) => s.data().q || 0);
    const b = market.liquidityB || defaultLiquidityB(optionDocs.length);

    const { proceeds, newQuantities, pricePerShare } = calcSellSharesLMSR(
      quantities, b, optionIndex, sharesToSell
    );

    const newPrices = getPricesLMSR(newQuantities, b);

    tx.update(userRef, { balance: user.balance + proceeds });

    optionDocs.forEach((d, i) => {
      tx.update(d.ref, {
        q: newQuantities[i],
        price: newPrices[i],
        lastUpdated: serverTimestamp(),
      });
    });

    tx.update(positionRef, {
      shares: position.shares - sharesToSell,
      lastUpdated: serverTimestamp(),
    });

    tx.set(betRef, {
      userId, marketId, optionId,
      type: "sell",
      amount: -proceeds,
      shares: -sharesToSell,
      priceAtBet: pricePerShare,
      createdAt: serverTimestamp(),
    });

    const historyRef = doc(collection(db, "markets", marketId, "priceHistory"));
    const historyEntry = { timestamp: serverTimestamp() };
    optionIds.forEach((id, i) => { historyEntry[id] = Math.round(newPrices[i] * 100); });
    tx.set(historyRef, historyEntry);
  });
}

export async function resolveMarketMulti(marketId, winningOptionId) {
  const { doc, runTransaction, collection, getDocs, query, where, writeBatch, serverTimestamp } = await import("firebase/firestore");
  const { db } = await import("./firebase");

  const marketRef = doc(db, "markets", marketId);

  await runTransaction(db, async (tx) => {
    const marketSnap = await tx.get(marketRef);
    if (!marketSnap.exists()) throw new Error("Marché introuvable");
    if (marketSnap.data().status !== "open") throw new Error("Marché déjà résolu");
    tx.update(marketRef, { status: "resolved", outcome: winningOptionId, resolvedAt: serverTimestamp() });
  });

  const allBetsQuery = query(
    collection(db, "bets"),
    where("marketId", "==", marketId),
    where("type", "==", "multi")
  );
  const allBetsSnap = await getDocs(allBetsQuery);

  let totalPool = 0;
  let totalWinningShares = 0;
  const winningBets = [];

  allBetsSnap.forEach((betDoc) => {
    const bet = betDoc.data();
    totalPool += bet.amount;
    if (bet.optionId === winningOptionId) {
      totalWinningShares += bet.shares;
      winningBets.push(bet);
    }
  });

  const batch = writeBatch(db);

  for (const bet of winningBets) {
    const ratio = bet.shares / totalWinningShares;
    const winnings = totalPool * ratio * 0.98;
    const userRef = doc(db, "users", bet.userId);
    const userSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", bet.userId)));
    const currentBalance = userSnap.docs[0]?.data()?.balance || 0;

    batch.update(userRef, { balance: currentBalance + Math.round(winnings) });

    const notifRef = doc(db, "notifications", `${bet.userId}_${marketId}`);
    batch.set(notifRef, {
      userId: bet.userId,
      type: "resolved",
      marketId,
      outcome: winningOptionId,
      payout: Math.round(winnings),
      read: false,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}