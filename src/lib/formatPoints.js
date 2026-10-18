// Affichage court des points pour les espaces étroits : 950, 12,5K, 1,2M, 3Md.
export function formatPointsShort(value) {
  const v = Number(value) || 0;
  const abs = Math.abs(v);
  const trim = (n) => n.toFixed(1).replace(/\.0$/, "").replace(".", ",");
  if (abs >= 1e9) return `${trim(v / 1e9)}Md`;
  if (abs >= 1e6) return `${trim(v / 1e6)}M`;
  if (abs >= 1e3) return `${trim(v / 1e3)}K`;
  return String(Math.round(v));
}
