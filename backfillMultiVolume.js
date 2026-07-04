// Script one-shot : recalcule totalVolume pour tous les marchés multi existants
// à partir de la collection "bets". À exécuter une seule fois après le déploiement
// du tracking totalVolume, pour que les marchés créés avant ce déploiement aient
// un volume correct sans attendre un nouveau trade.
//
// Usage : node backfillMultiVolume.js
//
// Prérequis :
//   npm install firebase-admin --save-dev
//   Une clé de service (Firebase Console > Paramètres du projet > Comptes de service
//   > Générer une nouvelle clé privée), sauvegardée par ex. en serviceAccountKey.json
//   à côté de ce script (NE PAS commit ce fichier, ajoute-le au .gitignore).

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync(new URL("./serviceAccountKey.json", import.meta.url)));

initializeApp({
  credential: cert(serviceAccount),
  projectId: "kassandre-f868e",
});

const db = getFirestore();

async function backfill() {
  const marketsSnap = await db.collection("markets").where("type", "==", "multi").get();
  console.log(`${marketsSnap.size} marché(s) multi trouvé(s).`);

  let updated = 0;

  for (const marketDoc of marketsSnap.docs) {
    const marketId = marketDoc.id;
    const betsSnap = await db.collection("bets").where("marketId", "==", marketId).get();

    let totalVolume = 0;
    betsSnap.forEach((betDoc) => {
      const bet = betDoc.data();
      // Achats en amount positif, ventes en amount négatif (voir index.js) :
      // on prend la valeur absolue pour que les deux comptent comme de l'activité.
      if (typeof bet.amount === "number") {
        totalVolume += Math.abs(bet.amount);
      }
    });

    await marketDoc.ref.update({ totalVolume });
    updated++;
    console.log(`  ${marketId} → totalVolume = ${Math.round(totalVolume)}`);
  }

  console.log(`Terminé. ${updated} marché(s) mis à jour.`);
}

backfill().catch((err) => {
  console.error("Erreur backfill :", err);
  process.exit(1);
});
