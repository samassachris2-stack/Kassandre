import { useEffect, useState } from "react";

// Réglages d'apparence, gardés dans le navigateur (localStorage).
export const STORAGE_KEY = "kassandre_appearance";

export const DEFAULTS = {
  theme: "dark",      // dark | light | auto | amoled
  accent: "violet",
  scale: 1,           // 0.9 | 1 | 1.1 | 1.2
  contrast: "normal", // normal | high
  motion: "normal",   // normal | reduced
  font: "default",    // default | serif | readable
};

// [couleur principale, texte sur fond sombre, texte sur fond clair]
export const ACCENTS = {
  violet: { label: "Violet", main: "#7c3aed", onDark: "#a78bfa", onLight: "#6d28d9" },
  bleu: { label: "Bleu", main: "#2563eb", onDark: "#60a5fa", onLight: "#1d4ed8" },
  cyan: { label: "Cyan", main: "#0891b2", onDark: "#22d3ee", onLight: "#0e7490" },
  vert: { label: "Vert", main: "#059669", onDark: "#34d399", onLight: "#047857" },
  orange: { label: "Orange", main: "#ea580c", onDark: "#fb923c", onLight: "#c2410c" },
  rose: { label: "Rose", main: "#db2777", onDark: "#f472b6", onLight: "#be185d" },
};

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

let current = { ...DEFAULTS };
const listeners = new Set();

export function loadAppearance() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (raw && typeof raw === "object") return { ...DEFAULTS, ...raw };
  } catch { /* stockage indisponible ou illisible */ }
  return { ...DEFAULTS };
}

export function resolveTheme(theme) {
  if (theme === "auto") {
    try {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch { return "dark"; }
  }
  return theme;
}

export function applyAppearance(s) {
  const root = document.documentElement;
  const theme = resolveTheme(s.theme);
  const accent = ACCENTS[s.accent] || ACCENTS.violet;
  const light = theme === "light";
  const text = light ? accent.onLight : accent.onDark;

  root.dataset.theme = theme;
  root.dataset.contrast = s.contrast;
  root.dataset.motion = s.motion;
  root.dataset.font = s.font;
  root.style.setProperty("--k-accent", accent.main);
  root.style.setProperty("--k-accent-rgb", hexToRgb(accent.main));
  root.style.setProperty("--k-accent-text", text);
  root.style.setProperty("--k-accent-text-rgb", hexToRgb(text));

  const rootEl = document.getElementById("root");
  if (rootEl) rootEl.style.zoom = s.scale && s.scale !== 1 ? String(s.scale) : "";

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "amoled" ? "#000000" : light ? "#f4f4f9" : "#0a0a0f");
  const scheme = document.querySelector('meta[name="color-scheme"]');
  if (scheme) scheme.setAttribute("content", light ? "light" : "dark");
}

export function setAppearance(patch) {
  current = { ...current, ...patch };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch { /* ignoré */ }
  applyAppearance(current);
  listeners.forEach((l) => l(current));
}

export function resetAppearance() {
  current = { ...DEFAULTS };
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignoré */ }
  applyAppearance(current);
  listeners.forEach((l) => l(current));
}

// À appeler une fois au démarrage (main.jsx).
export function initAppearance() {
  current = loadAppearance();
  applyAppearance(current);
  try {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener("change", () => { if (current.theme === "auto") applyAppearance(current); });
  } catch { /* ancien navigateur */ }
}

export function useAppearance() {
  const [s, setS] = useState(current);
  useEffect(() => {
    listeners.add(setS);
    return () => listeners.delete(setS);
  }, []);
  return s;
}
