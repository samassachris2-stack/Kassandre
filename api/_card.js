// Construit l'arbre d'éléments (format Satori, sans JSX) de l'image de partage
// d'un marché : question, probabilités en direct, et, si le lien contient
// ?pick=..., le pari de la personne qui partage. Le fichier commence par « _ »
// pour que Vercel n'en fasse pas une route.

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const PURPLE = "#7c3aed";
const LIGHT_PURPLE = "#a78bfa";
const GREEN = "#22c55e";
const RED = "#ef4444";

const LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 28 28">' +
      '<path d="M 22 22 A 12 12 0 0 1 6 14" fill="none" stroke="#7c3aed" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M 6 14 A 12 12 0 0 1 22 6" fill="none" stroke="#7c3aed" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="14" cy="14" r="4" fill="#7c3aed"/></svg>'
  );

// Raccourci pour écrire les éléments sans JSX.
const h = (type, style, children, extra = {}) => ({ type, props: { style, children, ...extra } });

// Coupe en fin de mot pour ne jamais finir sur « recon… ».
const clip = (s, n) => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd().replace(/[,;:.\s]+$/, "") + "…";
};

// Le pari affiché est toujours recalculé depuis les données du marché : on ne
// recopie jamais le texte de l'adresse. Binaire : "yes" / "no". Multi : le
// libellé exact d'une option.
export function resolvePick(market, pick) {
  if (!pick) return null;
  const options = Array.isArray(market.options) ? market.options : [];
  if (market.type === "multi") {
    const opt = options.find((o) => o.label === pick && typeof o.price === "number");
    return opt ? { label: opt.label, color: PURPLE, optionLabel: opt.label } : null;
  }
  if (pick === "yes") return { label: "OUI", color: GREEN, side: "yes" };
  if (pick === "no") return { label: "NON", color: RED, side: "no" };
  return null;
}

function bar(pct, color) {
  return h("div", { display: "flex", width: "100%", height: 14, borderRadius: 7, background: "#1d1d2b" }, [
    h("div", { display: "flex", width: `${Math.max(2, Math.min(100, pct))}%`, height: 14, borderRadius: 7, background: color }, ""),
  ]);
}

function binaryBlock(market, pick) {
  const total = (market.poolYes || 0) + (market.poolNo || 0);
  const pctYes = total > 0 ? Math.round((market.poolNo / total) * 100) : 50;
  const side = pick?.side || "yes";
  const pct = side === "yes" ? pctYes : 100 - pctYes;
  const color = side === "yes" ? GREEN : RED;
  const label = side === "yes" ? "Oui" : "Non";
  return h("div", { display: "flex", flexDirection: "column", width: "100%", gap: 18 }, [
    h("div", { display: "flex", alignItems: "flex-end", gap: 20 }, [
      h("div", { display: "flex", fontSize: 120, fontWeight: 800, color, lineHeight: 1 }, `${pct}%`),
      h("div", { display: "flex", fontSize: 30, color: "#a8a8b8", paddingBottom: 14 }, `de probabilité pour le ${label}`),
    ]),
    bar(pct, color),
  ]);
}

function multiBlock(market, pick) {
  const options = (Array.isArray(market.options) ? market.options : [])
    .filter((o) => o.label && typeof o.price === "number")
    .sort((a, b) => b.price - a.price);
  let shown = options.slice(0, 3);
  // Le pari doit toujours apparaître, même hors du top 3.
  if (pick && !shown.some((o) => o.label === pick.optionLabel)) {
    const chosen = options.find((o) => o.label === pick.optionLabel);
    if (chosen) shown = [...shown.slice(0, 2), chosen];
  }
  return h("div", { display: "flex", flexDirection: "column", width: "100%", gap: 16 },
    shown.map((o) => {
      const pct = Math.round(o.price * 100);
      const mine = pick && o.label === pick.optionLabel;
      return h("div", { display: "flex", flexDirection: "column", gap: 8 }, [
        h("div", { display: "flex", justifyContent: "space-between", fontSize: 28 }, [
          h("div", { display: "flex", color: mine ? "#ffffff" : "#c8c8d8", fontWeight: mine ? 800 : 400 }, clip(o.label, 44)),
          h("div", { display: "flex", color: mine ? LIGHT_PURPLE : "#e8e8f0", fontWeight: 800 }, `${pct}%`),
        ]),
        bar(pct, mine ? PURPLE : "#4c3a8a"),
      ]);
    })
  );
}

export function cardElement(market, pickParam) {
  const pick = resolvePick(market, pickParam);
  const isMulti = market.type === "multi";
  const resolved = market.status === "resolved";
  const question = clip(String(market.question || "Marché de prédiction"), 150);
  const qSize = question.length > 110 ? 44 : question.length > 70 ? 52 : 60;

  const badges = [];
  if (market.category) {
    badges.push(h("div", { display: "flex", fontSize: 24, color: LIGHT_PURPLE, background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.45)", padding: "6px 18px", borderRadius: 20 }, String(market.category)));
  }
  if (resolved) {
    badges.push(h("div", { display: "flex", fontSize: 24, color: "#a8a8b8", border: "1px solid #3a3a4a", padding: "6px 18px", borderRadius: 20 }, "Résolu"));
  }
  if (pick) {
    badges.push(h("div", { display: "flex", fontSize: 26, fontWeight: 800, color: "#ffffff", background: pick.color, padding: "8px 22px", borderRadius: 22 }, `Mon pari : ${clip(pick.label, 30)}`));
  }

  return h("div", {
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    boxSizing: "border-box", width: CARD_WIDTH, height: CARD_HEIGHT, padding: "48px 64px",
    background: "#0a0a0f", backgroundImage: "radial-gradient(circle at 85% 0%, rgba(124,58,237,0.38), rgba(10,10,15,0) 55%)",
    fontFamily: "Inter", color: "#e8e8f0",
  }, [
    h("div", { display: "flex", alignItems: "center", justifyContent: "space-between" }, [
      h("div", { display: "flex", alignItems: "center", gap: 14 }, [
        h("img", { width: 56, height: 56 }, undefined, { src: LOGO, width: 56, height: 56 }),
        h("div", { display: "flex", fontSize: 36, fontWeight: 800 }, "Kassandre"),
      ]),
      h("div", { display: "flex", gap: 12, alignItems: "center" }, badges),
    ]),
    h("div", { display: "flex", fontSize: qSize, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.01em" }, question),
    isMulti ? multiBlock(market, pick) : binaryBlock(market, pick),
    h("div", { display: "flex", justifyContent: "space-between", fontSize: 24, color: "#8888a0" }, [
      h("div", { display: "flex" }, "Le marché de prédictions francophone"),
      h("div", { display: "flex", color: LIGHT_PURPLE, fontWeight: 800 }, "kassandre.app"),
    ]),
  ]);
}
