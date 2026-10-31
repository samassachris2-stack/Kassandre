import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { app } from "./firebase";

// Consentement aux cookies de mesure d'audience (Firebase Analytics / GA4).
// Valeurs stockées : "accepted" | "refused". Absent = pas encore choisi.
const KEY = "kassandre_cookie_consent";

let started = false;
let analyticsInstance = null;
let lastPath = null;

export function getConsent() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// Visites internes exclues des statistiques : un drapeau par navigateur.
// Activation : ouvrir le site avec ?sans-stats=1 (le drapeau reste en mémoire).
// Désactivation : ?sans-stats=0.
const EXCLUDE_KEY = "kassandre_exclude_analytics";

function applyExcludeFlag() {
  try {
    const param = new URLSearchParams(location.search).get("sans-stats");
    if (param === "1") localStorage.setItem(EXCLUDE_KEY, "1");
    if (param === "0") localStorage.removeItem(EXCLUDE_KEY);
    return localStorage.getItem(EXCLUDE_KEY) === "1";
  } catch {
    return false;
  }
}

// Firebase Analytics n'est initialisé qu'après un accord explicite.
export async function startAnalytics() {
  const excluded = applyExcludeFlag(); // lu même sans consentement, pour pouvoir activer le drapeau
  if (started || excluded || getConsent() !== "accepted") return;
  if (location.hostname === "localhost") return;
  try {
    if (await isSupported()) {
      analyticsInstance = getAnalytics(app);
      // Firebase envoie déjà un page_view pour la page courante à l'initialisation
      lastPath = location.pathname;
      started = true;
    }
  } catch {
    // Navigateur sans support : on ne mesure rien
  }
}

// Firebase n'envoie un page_view qu'au chargement initial. Sur un site à
// navigation interne (React Router), il faut le signaler à chaque changement de page.
export function trackPageView(path, { force = false } = {}) {
  if (!analyticsInstance || (!force && path === lastPath)) return;
  lastPath = path;
  logEvent(analyticsInstance, "page_view", {
    page_path: path,
    page_location: location.href,
    page_title: document.title,
  });
}

export async function setConsent(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Stockage indisponible : le bandeau réapparaîtra au prochain chargement
  }
  if (value === "accepted") await startAnalytics();
}
