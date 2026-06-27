import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  calcShares, calcSellShares, calcSharesLMSR, calcSellSharesLMSR,
  getPricesLMSR, defaultLiquidityB,
} from "./amm-math.js";

initializeApp();
const db = getFirestore();

// ── Helpers communs ──────────────────────────────────────────────────────

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Tu dois être connecté pour effectuer cette action.");
  }
  return request.auth.uid;
}

function requireAdmin(userData) {
  if (!userData?.isAdmin) {
    throw new HttpsError("permission-denied", "Action réservée aux administrateurs.");
  }
}

// Rate limiting simple : impose un délai minimum entre deux actions de
// trading (placeBet/sellShares/placeBetMulti/sellSharesMulti) pour un même
// utilisateur. Doit être appelé À L'INTÉRIEUR de la transaction, juste après
// avoir lu userSnap, pour rester atomique avec le reste.
const TRADE_COOLDOWN_MS = 2000;

function checkTradeCooldown(user) {
  const lastTradeAt = user.lastTradeAt?.toMillis ? user.lastTradeAt.toMillis() : 0;
  const elapsed = Date.now() - lastTradeAt;
  if (elapsed < TRADE_COOLDOWN_MS) {
    throw new HttpsError(
      "resource-exhausted",
      "Trop de paris en peu de temps, attends un peu avant de réessayer."
    );
  }
}

// ── placeBet : achat de parts sur un marché binaire (OUI/NON) ────────────

export const placeBet = onCall({ enforceAppCheck: true }, async (request) => {
  const userId = requireAuth(request);
  const { marketId, side, amount } = request.data;

  if (!marketId || (side !== "yes" && side !== "no")) {
    throw new HttpsError("invalid-argument", "Paramètres invalides.");
  }
  if (typeof amount !== "number" || amount <= 0) {
    throw new HttpsError("invalid-argument", "Montant invalide.");
  }

  const userRef = db.collection("users").doc(userId);
  const marketRef = db.collection("markets").doc(marketId);
  const betRef = db.collection("bets").doc(`${userId}_${marketId}_${Date.now()}`);
  const positionRef = db.collection("positions").doc(`${userId}_${marketId}_${side}`);

  await db.runTransaction(async (tx) => {
    const [userSnap, marketSnap, positionSnap] = await Promise.all([
      tx.get(userRef), tx.get(marketRef), tx.get(positionRef),
    ]);

    if (!userSnap.exists) throw new HttpsError("not-found", "Utilisateur introuvable.");
    if (!marketSnap.exists) throw new HttpsError("not-found", "Marché introuvable.");

    const user = userSnap.data();
    const market = marketSnap.data();

    checkTradeCooldown(user);

    if (market.status !== "open") throw new HttpsError("failed-precondition", "Ce marché est fermé.");
    if (user.balance < amount) throw new HttpsError("failed-precondition", "Solde insuffisant.");

    const { shares, newPoolYes, newPoolNo, pricePerShare } = calcShares(
      market.poolYes, market.poolNo, side, amount
    );

    const pctYes = Math.round((newPoolNo / (newPoolYes + newPoolNo)) * 100);
    const currentShares = positionSnap.exists ? positionSnap.data().shares : 0;
    const currentCost = positionSnap.exists ? (positionSnap.data().totalCost || 0) : 0;

    tx.update(userRef, {
      balance: user.balance - amount,
      totalBets: (user.totalBets || 0) + 1,
      lastTradeAt: FieldValue.serverTimestamp(),
    });
    tx.update(marketRef, {
      poolYes: newPoolYes,
      poolNo: newPoolNo,
      lastUpdated: FieldValue.serverTimestamp(),
    });
    tx.set(positionRef, {
      userId, marketId, side,
      shares: currentShares + shares,
      totalCost: currentCost + amount,
      lastUpdated: FieldValue.serverTimestamp(),
    });
    tx.set(betRef, {
      userId, marketId, side, amount, shares,
      priceAtBet: pricePerShare,
      createdAt: FieldValue.serverTimestamp(),
    });
    const historyRef = marketRef.collection("priceHistory").doc();
    tx.set(historyRef, { pctYes, pctNo: 100 - pctYes, timestamp: FieldValue.serverTimestamp() });
  });

  return { success: true };
});

// ── sellShares : vente de parts sur un marché binaire ─────────────────────

export const sellShares = onCall({ enforceAppCheck: true }, async (request) => {
  const userId = requireAuth(request);
  const { marketId, side, sharesToSell } = request.data;

  if (!marketId || (side !== "yes" && side !== "no")) {
    throw new HttpsError("invalid-argument", "Paramètres invalides.");
  }
  if (typeof sharesToSell !== "number" || sharesToSell <= 0) {
    throw new HttpsError("invalid-argument", "Quantité invalide.");
  }

  const userRef = db.collection("users").doc(userId);
  const marketRef = db.collection("markets").doc(marketId);
  const positionRef = db.collection("positions").doc(`${userId}_${marketId}_${side}`);
  const betRef = db.collection("bets").doc(`${userId}_${marketId}_${Date.now()}_sell`);

  await db.runTransaction(async (tx) => {
    const [userSnap, marketSnap, positionSnap] = await Promise.all([
      tx.get(userRef), tx.get(marketRef), tx.get(positionRef),
    ]);

    if (!userSnap.exists) throw new HttpsError("not-found", "Utilisateur introuvable.");
    if (!marketSnap.exists) throw new HttpsError("not-found", "Marché introuvable.");
    if (!positionSnap.exists) throw new HttpsError("failed-precondition", "Aucune position à vendre.");

    const user = userSnap.data();
    const market = marketSnap.data();
    const position = positionSnap.data();

    checkTradeCooldown(user);

    if (market.status !== "open") throw new HttpsError("failed-precondition", "Ce marché est fermé.");
    if (sharesToSell > position.shares) {
      throw new HttpsError("failed-precondition", "Tu ne possèdes pas autant de parts.");
    }

    const { proceeds, newPoolYes, newPoolNo, pricePerShare } = calcSellShares(
      market.poolYes, market.poolNo, side, sharesToSell
    );

    if (newPoolYes <= 0 || newPoolNo <= 0) {
      throw new HttpsError("failed-precondition", "Vente impossible : liquidité insuffisante dans le pool.");
    }

    const pctYes = Math.round((newPoolNo / (newPoolYes + newPoolNo)) * 100);
    const currentCost = position.totalCost || 0;
    const costRatio = sharesToSell / position.shares;
    const costRemoved = currentCost * costRatio;

    tx.update(userRef, { balance: user.balance + proceeds, lastTradeAt: FieldValue.serverTimestamp() });
    tx.update(marketRef, {
      poolYes: newPoolYes,
      poolNo: newPoolNo,
      lastUpdated: FieldValue.serverTimestamp(),
    });
    tx.update(positionRef, {
      shares: position.shares - sharesToSell,
      totalCost: Math.max(0, currentCost - costRemoved),
      lastUpdated: FieldValue.serverTimestamp(),
    });
    tx.set(betRef, {
      userId, marketId, side,
      type: "sell",
      amount: -proceeds,
      shares: -sharesToSell,
      priceAtBet: pricePerShare,
      createdAt: FieldValue.serverTimestamp(),
    });
    const historyRef = marketRef.collection("priceHistory").doc();
    tx.set(historyRef, { pctYes, pctNo: 100 - pctYes, timestamp: FieldValue.serverTimestamp() });
  });

  return { success: true };
});

// ── placeBetMulti : achat de parts sur un marché multi-choix (LMSR) ───────

export const placeBetMulti = onCall({ enforceAppCheck: true }, async (request) => {
  const userId = requireAuth(request);
  const { marketId, optionId, amount } = request.data;

  if (!marketId || !optionId) {
    throw new HttpsError("invalid-argument", "Paramètres invalides.");
  }
  if (typeof amount !== "number" || amount <= 0) {
    throw new HttpsError("invalid-argument", "Montant invalide.");
  }

  const userRef = db.collection("users").doc(userId);
  const marketRef = db.collection("markets").doc(marketId);
  const betRef = db.collection("bets").doc(`${userId}_${marketId}_${optionId}_${Date.now()}`);
  const positionRef = db.collection("positions").doc(`${userId}_${marketId}_${optionId}`);

  const optionsSnap = await marketRef.collection("options").orderBy("createdAt", "asc").get();
  const optionDocs = optionsSnap.docs;
  const optionIds = optionDocs.map((d) => d.id);
  const optionIndex = optionIds.indexOf(optionId);
  if (optionIndex === -1) throw new HttpsError("not-found", "Option introuvable.");

  await db.runTransaction(async (tx) => {
    const [userSnap, marketSnap, positionSnap] = await Promise.all([
      tx.get(userRef), tx.get(marketRef), tx.get(positionRef),
    ]);

    if (!userSnap.exists) throw new HttpsError("not-found", "Utilisateur introuvable.");
    if (!marketSnap.exists) throw new HttpsError("not-found", "Marché introuvable.");

    const user = userSnap.data();
    const market = marketSnap.data();

    checkTradeCooldown(user);

    if (market.status !== "open") throw new HttpsError("failed-precondition", "Ce marché est fermé.");
    if (user.balance < amount) throw new HttpsError("failed-precondition", "Solde insuffisant.");

    const optionSnaps = await Promise.all(optionDocs.map((d) => tx.get(d.ref)));
    const quantities = optionSnaps.map((s) => s.data().q || 0);
    const b = market.liquidityB || defaultLiquidityB(optionDocs.length);

    const { shares, newQuantities, pricePerShare } = calcSharesLMSR(
      quantities, b, optionIndex, amount
    );

    const currentShares = positionSnap.exists ? positionSnap.data().shares : 0;
    const currentCost = positionSnap.exists ? (positionSnap.data().totalCost || 0) : 0;

    tx.update(userRef, {
      balance: user.balance - amount,
      totalBets: (user.totalBets || 0) + 1,
      lastTradeAt: FieldValue.serverTimestamp(),
    });

    const newPrices = getPricesLMSR(newQuantities, b);
    optionDocs.forEach((d, i) => {
      tx.update(d.ref, {
        q: newQuantities[i],
        price: newPrices[i],
        lastUpdated: FieldValue.serverTimestamp(),
      });
    });

    tx.set(positionRef, {
      userId, marketId, optionId, type: "multi",
      shares: currentShares + shares,
      totalCost: currentCost + amount,
      lastUpdated: FieldValue.serverTimestamp(),
    });
    tx.set(betRef, {
      userId, marketId, optionId, type: "multi", amount, shares,
      priceAtBet: pricePerShare,
      createdAt: FieldValue.serverTimestamp(),
    });

    const historyRef = marketRef.collection("priceHistory").doc();
    const historyEntry = { timestamp: FieldValue.serverTimestamp() };
    optionIds.forEach((id, i) => { historyEntry[id] = Math.round(newPrices[i] * 100); });
    tx.set(historyRef, historyEntry);
  });

  return { success: true };
});

// ── sellSharesMulti : vente de parts sur un marché multi-choix (LMSR) ────

export const sellSharesMulti = onCall({ enforceAppCheck: true }, async (request) => {
  const userId = requireAuth(request);
  const { marketId, optionId, sharesToSell } = request.data;

  if (!marketId || !optionId) {
    throw new HttpsError("invalid-argument", "Paramètres invalides.");
  }
  if (typeof sharesToSell !== "number" || sharesToSell <= 0) {
    throw new HttpsError("invalid-argument", "Quantité invalide.");
  }

  const userRef = db.collection("users").doc(userId);
  const marketRef = db.collection("markets").doc(marketId);
  const positionRef = db.collection("positions").doc(`${userId}_${marketId}_${optionId}`);
  const betRef = db.collection("bets").doc(`${userId}_${marketId}_${optionId}_${Date.now()}_sell`);

  const optionsSnap = await marketRef.collection("options").orderBy("createdAt", "asc").get();
  const optionDocs = optionsSnap.docs;
  const optionIds = optionDocs.map((d) => d.id);
  const optionIndex = optionIds.indexOf(optionId);
  if (optionIndex === -1) throw new HttpsError("not-found", "Option introuvable.");

  await db.runTransaction(async (tx) => {
    const [userSnap, marketSnap, positionSnap] = await Promise.all([
      tx.get(userRef), tx.get(marketRef), tx.get(positionRef),
    ]);

    if (!userSnap.exists) throw new HttpsError("not-found", "Utilisateur introuvable.");
    if (!marketSnap.exists) throw new HttpsError("not-found", "Marché introuvable.");
    if (!positionSnap.exists) throw new HttpsError("failed-precondition", "Aucune position à vendre.");

    const user = userSnap.data();
    const market = marketSnap.data();
    const position = positionSnap.data();

    checkTradeCooldown(user);

    if (market.status !== "open") throw new HttpsError("failed-precondition", "Ce marché est fermé.");
    if (sharesToSell > position.shares) {
      throw new HttpsError("failed-precondition", "Tu ne possèdes pas autant de parts.");
    }

    const optionSnaps = await Promise.all(optionDocs.map((d) => tx.get(d.ref)));
    const quantities = optionSnaps.map((s) => s.data().q || 0);
    const b = market.liquidityB || defaultLiquidityB(optionDocs.length);

    const { proceeds, newQuantities, pricePerShare } = calcSellSharesLMSR(
      quantities, b, optionIndex, sharesToSell
    );

    const newPrices = getPricesLMSR(newQuantities, b);
    const currentCost = position.totalCost || 0;
    const costRatio = sharesToSell / position.shares;
    const costRemoved = currentCost * costRatio;

    tx.update(userRef, { balance: user.balance + proceeds, lastTradeAt: FieldValue.serverTimestamp() });

    optionDocs.forEach((d, i) => {
      tx.update(d.ref, {
        q: newQuantities[i],
        price: newPrices[i],
        lastUpdated: FieldValue.serverTimestamp(),
      });
    });

    tx.update(positionRef, {
      shares: position.shares - sharesToSell,
      totalCost: Math.max(0, currentCost - costRemoved),
      lastUpdated: FieldValue.serverTimestamp(),
    });

    tx.set(betRef, {
      userId, marketId, optionId,
      type: "sell",
      amount: -proceeds,
      shares: -sharesToSell,
      priceAtBet: pricePerShare,
      createdAt: FieldValue.serverTimestamp(),
    });

    const historyRef = marketRef.collection("priceHistory").doc();
    const historyEntry = { timestamp: FieldValue.serverTimestamp() };
    optionIds.forEach((id, i) => { historyEntry[id] = Math.round(newPrices[i] * 100); });
    tx.set(historyRef, historyEntry);
  });

  return { success: true };
});

// ── resolveMarket : résolution d'un marché et distribution des gains ─────
// Réservée aux admins. Avec le SDK admin, aucune limite de get() liée à des
// règles de sécurité (contrairement au client, qui devait faire des
// suppressions une par une pour cette raison) — un batch groupé suffit ici.

// Normalise `categories` en array, certains docs plus anciens le stockent
// comme une string simple plutôt qu'un array.
function toCatArray(cats) {
  if (Array.isArray(cats)) return cats;
  if (typeof cats === "string" && cats.trim()) return [cats.trim()];
  return [];
}

export const resolveMarket = onCall({ enforceAppCheck: true }, async (request) => {
  const userId = requireAuth(request);
  const { marketId, outcome } = request.data;

  if (!marketId || outcome === undefined || outcome === null) {
    throw new HttpsError("invalid-argument", "Paramètres invalides.");
  }

  const userSnap = await db.collection("users").doc(userId).get();
  requireAdmin(userSnap.data());

  const marketRef = db.collection("markets").doc(marketId);
  let marketType = "binary";
  let marketCategories = [];

  await db.runTransaction(async (tx) => {
    const marketSnap = await tx.get(marketRef);
    if (!marketSnap.exists) throw new HttpsError("not-found", "Marché introuvable.");
    if (marketSnap.data().status !== "open") throw new HttpsError("failed-precondition", "Marché déjà résolu.");
    marketType = marketSnap.data().type === "multi" ? "multi" : "binary";
    marketCategories = toCatArray(marketSnap.data().categories);
    tx.update(marketRef, { status: "resolved", outcome, resolvedAt: FieldValue.serverTimestamp() });
  });

  const winningField = marketType === "multi" ? "optionId" : "side";

  const [winSnap, loseSnap] = await Promise.all([
    db.collection("bets").where("marketId", "==", marketId).where(winningField, "==", outcome).get(),
    db.collection("bets").where("marketId", "==", marketId).where(winningField, "!=", outcome).get(),
  ]);

  let totalWinningShares = 0;
  winSnap.forEach((b) => { totalWinningShares += b.data().shares; });

  let totalLosingAmount = 0;
  loseSnap.forEach((b) => { totalLosingAmount += b.data().amount; });

  const winnerIds = [...new Set(winSnap.docs.map((d) => d.data().userId))];
  const winnerBalances = {};
  await Promise.all(winnerIds.map(async (uid) => {
    const uSnap = await db.collection("users").doc(uid).get();
    winnerBalances[uid] = uSnap.exists ? (uSnap.data().balance || 0) : 0;
  }));

  const payoutByUser = {};
  winSnap.forEach((betDoc) => {
    const bet = betDoc.data();
    const ratio = totalWinningShares > 0 ? bet.shares / totalWinningShares : 0;
    const winnings = bet.amount + ratio * totalLosingAmount * 0.98;
    payoutByUser[bet.userId] = (payoutByUser[bet.userId] || 0) + winnings;
  });

  // Stats de précision pour le leaderboard : un résultat (gagné/perdu) par
  // utilisateur sur ce marché, pas par bet individuel — sinon split son pari
  // en plusieurs petits achats gonflerait artificiellement le compteur.
  // FieldValue.increment ne nécessite pas de lire l'état actuel au préalable.
  const winnerIdSet = new Set(winSnap.docs.map((d) => d.data().userId));
  const loserIdSet = new Set(
    loseSnap.docs.map((d) => d.data().userId).filter((uid) => !winnerIdSet.has(uid))
  );
  const allParticipantIds = [...winnerIdSet, ...loserIdSet];

  const statsBatch = db.batch();
  allParticipantIds.forEach((uid) => {
    const won = winnerIdSet.has(uid);
    const userRef = db.collection("users").doc(uid);
    const update = { totalResolvedBets: FieldValue.increment(1) };
    if (won) update.totalWins = FieldValue.increment(1);
    marketCategories.forEach((cat) => {
      update[`categoryStats.${cat}.resolved`] = FieldValue.increment(1);
      if (won) update[`categoryStats.${cat}.wins`] = FieldValue.increment(1);
    });
    statsBatch.update(userRef, update);
  });
  if (allParticipantIds.length > 0) await statsBatch.commit();

  const batch = db.batch();
  Object.entries(payoutByUser).forEach(([uid, totalWinnings]) => {
    const userRef = db.collection("users").doc(uid);
    const newBalance = (winnerBalances[uid] || 0) + totalWinnings;
    batch.update(userRef, { balance: newBalance });

    const notifRef = db.collection("notifications").doc(`${uid}_${marketId}`);
    batch.set(notifRef, {
      userId: uid, type: "resolved", marketId, outcome,
      payout: Math.round(totalWinnings),
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return { success: true };
});

// ── deleteMarket : suppression complète d'un marché et de ses données ────
// Réservée aux admins. Équivalent serveur de deleteOneMarket côté Admin.jsx.

export const deleteMarket = onCall({ enforceAppCheck: true }, async (request) => {
  const userId = requireAuth(request);
  const { marketId } = request.data;
  if (!marketId) throw new HttpsError("invalid-argument", "marketId manquant.");

  const userSnap = await db.collection("users").doc(userId).get();
  requireAdmin(userSnap.data());

  const marketRef = db.collection("markets").doc(marketId);

  const optsSnap = await marketRef.collection("options").get();
  if (!optsSnap.empty) {
    const batch = db.batch();
    optsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  const histSnap = await marketRef.collection("priceHistory").get();
  if (!histSnap.empty) {
    const batch = db.batch();
    histSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  const betsSnap = await db.collection("bets").where("marketId", "==", marketId).get();
  if (!betsSnap.empty) {
    const batch = db.batch();
    betsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  const posSnap = await db.collection("positions").where("marketId", "==", marketId).get();
  if (!posSnap.empty) {
    const batch = db.batch();
    posSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await marketRef.delete();
  return { success: true };
});

// ── Snapshots planifiés pour le leaderboard Hebdo/Mensuel ────────────────
// Copient `balance` dans un champ snapshot à intervalle régulier. Le
// classement Hebdo/Mensuel = balance actuel - snapshot le plus récent.
// Firestore limite un batch à 500 writes, donc on chunke si besoin.

async function snapshotAllBalances(fieldName) {
  const usersSnap = await db.collection("users").get();
  const docs = usersSnap.docs;
  const CHUNK_SIZE = 450; // marge sous la limite de 500 writes/batch

  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const batch = db.batch();
    docs.slice(i, i + CHUNK_SIZE).forEach((userDoc) => {
      batch.update(userDoc.ref, { [fieldName]: userDoc.data().balance ?? 0 });
    });
    await batch.commit();
  }

  return docs.length;
}

// Tous les lundis à 00h05, heure de Paris.
export const snapshotWeeklyBalances = onSchedule(
  { schedule: "5 0 * * 1", timeZone: "Europe/Paris" },
  async () => {
    const count = await snapshotAllBalances("balanceSnapshotWeekly");
    console.log(`Snapshot hebdo effectué pour ${count} utilisateur(s).`);
  }
);

// Le 1er de chaque mois à 00h10, heure de Paris.
export const snapshotMonthlyBalances = onSchedule(
  { schedule: "10 0 1 * *", timeZone: "Europe/Paris" },
  async () => {
    const count = await snapshotAllBalances("balanceSnapshotMonthly");
    console.log(`Snapshot mensuel effectué pour ${count} utilisateur(s).`);
  }
);