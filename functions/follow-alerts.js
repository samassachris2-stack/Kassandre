// Logique pure des alertes de suivi (testable sans Firestore).

// Variation minimale, en points de pourcentage sur 24 h, qui déclenche une alerte.
export const MOVE_THRESHOLD = 10;

// Une entrée de priceHistory vaut { pctYes, pctNo, timestamp } pour un marché
// binaire, ou { timestamp, [optionId]: pct } pour un marché à choix multiples.
// Renvoie la plus forte variation si elle atteint le seuil, sinon null.
export function detectMove(baseline, latest, optionLabels = {}) {
  if (!baseline || !latest) return null;

  if (typeof baseline.pctYes === "number" && typeof latest.pctYes === "number") {
    const diff = latest.pctYes - baseline.pctYes;
    if (Math.abs(diff) < MOVE_THRESHOLD) return null;
    return { label: "Oui", from: baseline.pctYes, to: latest.pctYes };
  }

  let best = null;
  for (const key of Object.keys(latest)) {
    if (typeof latest[key] !== "number" || typeof baseline[key] !== "number") continue;
    const diff = Math.abs(latest[key] - baseline[key]);
    if (diff >= MOVE_THRESHOLD && (!best || diff > best.diff)) {
      best = { diff, label: optionLabels[key] || "Une option", from: baseline[key], to: latest[key] };
    }
  }
  return best && { label: best.label, from: best.from, to: best.to };
}

export function outcomeLabelFor(outcome, optionLabel) {
  if (optionLabel) return optionLabel;
  if (outcome === "yes") return "Oui";
  if (outcome === "no") return "Non";
  return null;
}
