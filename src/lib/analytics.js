import { getAnalytics, isSupported } from "firebase/analytics";
import { app } from "./firebase";

// Consentement aux cookies de mesure d'audience (Firebase Analytics / GA4).
// Valeurs stockées : "accepted" | "refused". Absent = pas encore choisi.
const KEY = "kassandre_cookie_consent";

let started = false;

export function getConsent() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// Firebase Analytics n'est initialisé qu'après un accord explicite.
export async function startAnalytics() {
  if (started || getConsent() !== "accepted") return;
  if (location.hostname === "localhost") return;
  try {
    if (await isSupported()) {
      getAnalytics(app);
      started = true;
    }
  } catch {
    // Navigateur sans support : on ne mesure rien
  }
}

export async function setConsent(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Stockage indisponible : le bandeau réapparaîtra au prochain chargement
  }
  if (value === "accepted") await startAnalytics();
}
