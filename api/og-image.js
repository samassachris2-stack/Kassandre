// Image de partage (1200x630) d'un marché. Adresse publique : /og/market/MARKET_ID.png[?pick=yes|no|libellé]
// (vercel.json la redirige vers /api/og-image?id=MARKET_ID).
// Les robots de X, Facebook, LinkedIn, WhatsApp... la chargent via la balise
// og:image posée par api/og.js. En cas d'échec, on redirige vers l'image fixe
// du site : un partage ne doit jamais se retrouver sans image.
import { readFileSync } from "node:fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { cardElement, CARD_WIDTH, CARD_HEIGHT } from "./_card.js";

const SITE = "https://kassandre.app";
const OG_DATA_URL = "https://us-central1-kassandre-f868e.cloudfunctions.net/ogData";
const ID_RE = /^[\p{L}\p{N}_-]{1,200}$/u;

// Chargées une fois par instance (les chemins sont suivis par Vercel au déploiement).
let fonts;
function loadFonts() {
  if (!fonts) {
    const read = (f) => {
      const b = readFileSync(new URL(`./_fonts/${f}`, import.meta.url));
      return b;
    };
    fonts = [
      { name: "Inter", data: read("inter-latin-400-normal.woff"), weight: 400, style: "normal" },
      { name: "Inter", data: read("inter-latin-800-normal.woff"), weight: 800, style: "normal" },
    ];
  }
  return fonts;
}

function fallback(res) {
  res.statusCode = 302;
  res.setHeader("Location", `${SITE}/og-image.png`);
  res.setHeader("Cache-Control", "public, s-maxage=60");
  res.end();
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, SITE);
    const id = url.searchParams.get("id") || "";
    const pick = (url.searchParams.get("pick") || "").slice(0, 120);
    if (!ID_RE.test(id)) return fallback(res);

    const r = await fetch(`${OG_DATA_URL}?kind=market&id=${encodeURIComponent(id)}`);
    if (!r.ok) return fallback(res);
    const market = await r.json();

    const svg = await satori(cardElement(market, pick), {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fonts: loadFonts(),
    });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: CARD_WIDTH } }).render().asPng();

    res.statusCode = 200;
    res.setHeader("Content-Type", "image/png");
    // Les probabilités bougent : cache court côté CDN, rafraîchi en arrière-plan.
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");
    res.end(png);
  } catch (e) {
    console.error("og-image: échec", e.message);
    fallback(res);
  }
}
