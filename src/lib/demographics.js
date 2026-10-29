import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Profil facultatif servant aux statistiques agrégées (jamais publié individuellement).
export const AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

export const PROFESSIONS = [
  { id: "etudiant", label: "Étudiant" },
  { id: "tech", label: "Tech et numérique" },
  { id: "sante", label: "Santé et social" },
  { id: "enseignement", label: "Enseignement et recherche" },
  { id: "finance", label: "Finance, assurance, immobilier" },
  { id: "commerce", label: "Commerce, vente, services" },
  { id: "industrie", label: "Industrie, ingénierie, transport" },
  { id: "public", label: "Administration et fonction publique" },
  { id: "artisanat", label: "Artisanat, BTP, agriculture" },
  { id: "medias", label: "Médias, culture, communication" },
  { id: "sans-emploi", label: "Sans emploi" },
  { id: "retraite", label: "Retraité" },
  { id: "autre", label: "Autre" },
];

export const professionLabel = (id) => PROFESSIONS.find((p) => p.id === id)?.label || id;

export async function loadDemographics(uid) {
  const snap = await getDoc(doc(db, "demographics", uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveDemographics(uid, { dept, arr, ageBand, profession }, existing) {
  const data = {
    consent: true,
    consentAt: existing?.consentAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (dept) data.dept = dept;
  if (dept === "75" && arr) data.arr = Number(arr);
  if (ageBand) data.ageBand = ageBand;
  if (profession) data.profession = profession;
  await setDoc(doc(db, "demographics", uid), data);
}

export const deleteDemographics = (uid) => deleteDoc(doc(db, "demographics", uid));
