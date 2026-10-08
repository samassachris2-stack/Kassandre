/**
 * Utilitaire pour ajouter les markets manifestations
 * À appeler depuis le panel admin
 */

import { db } from "./firebase";
import { collection, addDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";

const MANIFESTATIONS_MARKETS = [
  {
    type: "binary",
    question: "Y aura-t-il une manifestation nationale avant la fin novembre 2026 ?",
    description: "Manifestation de plus de 100 000 personnes en France métropolitaine",
    categories: ["Politique", "Syndicats"],
    tags: ["manifestations", "protestation", "france"],
    resolutionDate: new Date("2026-12-01"),
    resolutionSource: "INSEE, Ministère Intérieur, presse majeure",
  },
  {
    type: "multi",
    question: "Quel secteur sera le plus impacté par les manifestations (nov-déc 2026) ?",
    description: "Le secteur avec le plus de perturbations signalées",
    options: ["Transports publics", "Santé", "Éducation", "Pas de perturbations majeures"],
    categories: ["Économie", "Syndicats"],
    tags: ["manifestations", "secteurs", "impact"],
    resolutionDate: new Date("2026-12-15"),
    resolutionSource: "Rapports d'impact économique, médias",
  },
  {
    type: "multi",
    question: "Nombre estimé de manifestants lors de la plus grande manif (nov-déc 2026)",
    description: "Chiffre officiel du Ministère Intérieur pour la manifestation la plus importante",
    options: ["Moins de 50 000", "50K - 150K", "150K - 500K", "Plus de 500K"],
    categories: ["Politique", "Syndicats"],
    tags: ["manifestations", "nombre", "amplitude"],
    resolutionDate: new Date("2026-12-20"),
    resolutionSource: "Ministère de l'Intérieur (chiffres officiels)",
  },
  {
    type: "binary",
    question: "Les manifestations entraîneront-elles une perte économique > 1 milliard EUR (2026) ?",
    description: "Impact cumulé sur production, transport, tourisme",
    categories: ["Économie"],
    tags: ["manifestations", "économie", "impact"],
    resolutionDate: new Date("2027-01-31"),
    resolutionSource: "INSEE, rapports d'impact économique",
  },
  {
    type: "multi",
    question: "Quel syndicat mènera la mobilisation principale ?",
    description: "Le syndicat organisateur de la plus grande manifestation",
    options: ["CGT", "CFDT", "FO", "Collectif inter-syndical", "Mouvement spontané"],
    categories: ["Politique", "Syndicats"],
    tags: ["manifestations", "syndicats", "leaders"],
    resolutionDate: new Date("2026-12-10"),
    resolutionSource: "Presse majeure, annonces syndicales",
  },
  {
    type: "binary",
    question: "Les manifestations paralyseront-elles la SNCF pendant >5 jours (nov-déc) ?",
    description: "Grève affectant les TER/TGF avec annulation >50% des trajets",
    categories: ["Économie", "Transports"],
    tags: ["manifestations", "sncf", "transports"],
    resolutionDate: new Date("2026-12-20"),
    resolutionSource: "SNCF (rapports officiels), presse",
  },
  {
    type: "binary",
    question: "Le gouvernement annulera-t-il ou reportera-t-il sa réforme suite aux manifs ?",
    description: "Retrait ou suspension de la réforme visée par les manifestants",
    categories: ["Politique"],
    tags: ["manifestations", "gouvernement", "politique"],
    resolutionDate: new Date("2027-01-15"),
    resolutionSource: "Annonces gouvernementales, presse majeure",
  },
  {
    type: "multi",
    question: "Niveau d'escalade des tensions (nov-déc 2026)",
    description: "Le point culminant de la crise sociale",
    options: [
      "Manifestations pacifiques uniquement",
      "Affrontements mineurs avec police",
      "Blocages infrastructure critiques",
      "Situation de crise majeure",
    ],
    categories: ["Politique", "Sécurité"],
    tags: ["manifestations", "escalade", "tensions"],
    resolutionDate: new Date("2026-12-25"),
    resolutionSource: "Rapports police, ministère Intérieur, presse",
  },
  {
    type: "binary",
    question: "La fonction publique sera-t-elle en grève >50% en nov-déc 2026 ?",
    description: "Grève affectant administration, éducation, santé publique",
    categories: ["Économie", "Emploi"],
    tags: ["manifestations", "fonction-publique", "grève"],
    resolutionDate: new Date("2026-12-15"),
    resolutionSource: "Ministère Fonction Publique, rapports syndicaux",
  },
];

export async function seedManifestationsMarkets(userId) {
  let created = 0;
  let failed = 0;

  for (const market of MANIFESTATIONS_MARKETS) {
    try {
      const marketRef = await addDoc(collection(db, "markets"), {
        question: market.question,
        description: market.description,
        categories: market.categories,
        tags: market.tags || [],
        resolutionDate: market.resolutionDate,
        resolutionSource: market.resolutionSource,
        type: market.type,
        status: "open",
        outcome: null,
        totalVolume: 0,
        createdBy: userId,
        createdAt: serverTimestamp(),
        ...(market.type === "binary"
          ? { poolYes: 100, poolNo: 100 }
          : { liquidityB: Math.round(75 * Math.log(market.options.length + 1)) }
        ),
      });

      // Ajouter les options pour les markets multi
      if (market.type === "multi" && market.options) {
        const equalPrice = 1 / market.options.length;
        const usedIds = new Set();

        for (const label of market.options) {
          let baseId = label
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[^a-z0-9\s]/g, "")
            .trim()
            .replace(/\s+/g, "_");

          if (!baseId) baseId = "option";
          let finalId = baseId;
          let suffix = 1;

          while (usedIds.has(finalId)) {
            finalId = `${baseId}_${suffix}`;
            suffix++;
          }
          usedIds.add(finalId);

          await setDoc(doc(db, "markets", marketRef.id, "options", finalId), {
            label,
            q: 0,
            price: equalPrice,
            createdAt: serverTimestamp(),
          });
        }
      }

      created++;
    } catch (error) {
      console.error("Erreur création market:", error);
      failed++;
    }
  }

  return { created, failed, total: MANIFESTATIONS_MARKETS.length };
}
