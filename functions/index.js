const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const ADMIN_UID = "nMZUtFYpMjUMoxoLBJR3Sb3hefp1";

exports.resolveMarket = onCall(async (request) => {
  if (request.auth?.uid !== ADMIN_UID) {
    throw new HttpsError("permission-denied", "Non autorisé");
  }

  const { marketId, outcome } = request.data;
  if (!marketId || !outcome) {
    throw new HttpsError("invalid-argument", "marketId et outcome requis");
  }

  const marketRef = db.collection("markets").doc(marketId);
  const marketSnap = await marketRef.get();

  if (!marketSnap.exists) {
    throw new HttpsError("not-found", "Marché introuvable");
  }
  const market = marketSnap.data();
  if (market.status !== "open") {
    throw new HttpsError("failed-precondition", "Marché déjà résolu");
  }

  const isMulti = market.type === "multi";
  const winningField = isMulti ? "optionId" : "side";

  await marketRef.update({
    status: "resolved",
    outcome,
    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const betsSnap = await db
    .collection("bets")
    .where("marketId", "==", marketId)
    .get();

  let totalPool = 0;
  let totalWinningShares = 0;
  const winningBets = [];
  const losingAmounts = [];

  betsSnap.forEach((doc) => {
    const bet = doc.data();
    totalPool += bet.amount;
    if (bet[winningField] === outcome) {
      totalWinningShares += bet.shares;
      winningBets.push(bet);
    } else {
      losingAmounts.push(bet.amount);
    }
  });

  const totalLosingAmount = losingAmounts.reduce((a, b) => a + b, 0);

  const batch = db.batch();

  for (const bet of winningBets) {
    const ratio = totalWinningShares > 0 ? bet.shares / totalWinningShares : 0;
    const winnings = isMulti
      ? totalPool * ratio * 0.98
      : bet.amount + ratio * totalLosingAmount * 0.98;

    const userRef = db.collection("users").doc(bet.userId);
    batch.update(userRef, {
      balance: admin.firestore.FieldValue.increment(Math.round(winnings)),
    });

    const notifRef = db.collection("notifications").doc(`${bet.userId}_${marketId}`);
    batch.set(notifRef, {
      userId: bet.userId,
      type: "resolved",
      marketId,
      outcome,
      payout: Math.round(winnings),
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return { success: true, winnersCount: winningBets.length, totalPool };
});