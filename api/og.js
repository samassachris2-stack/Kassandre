// Rend un HTML avec les bonnes balises (title, description, Open Graph, Twitter,
// canonical) pour les robots qui n'exécutent pas JavaScript : Facebook, X,
// LinkedIn, WhatsApp, Telegram, Slack, Discord, iMessage... (voir vercel.json,
// qui n'envoie ici que les requêtes dont le User-Agent est un robot connu).
//
// Principe : on part du vrai index.html du site (donc rien ne casse si le robot
// exécute le JS, comme Googlebot), on y injecte les balises <head> et, pour les
// articles et marchés, un aperçu du contenu dans #root.
//
// Sécurité du rendu : en cas d'échec (Firestore injoignable, document absent...),
// on renvoie simplement le shell avec les balises par défaut. Cette fonction ne
// doit jamais empêcher un robot d'accéder à la page.

const SITE = "https://kassandre.app";
// Cloud Function publique et en lecture seule (functions/index.js : ogData).
// Elle lit Firestore avec l'Admin SDK : un appel REST direct est refusé (403)
// car il n'a pas de jeton App Check.
const OG_DATA_URL = "https://us-central1-kassandre-f868e.cloudfunctions.net/ogData";
const DEFAULT_IMAGE = `${SITE}/og-image.png`;
const DEFAULT_TITLE = "Kassandre | Marchés de prédiction francophone";
const DEFAULT_DESC =
  "Prédisez l'actualité avec des points virtuels : politique, économie, crypto, sport. Le marché de prédictions francophone, gratuit et sans risque.";

// ── Helpers ────────────────────────────────────────────────────────────────

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const stripHtml = (html) =>
  String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (s, n = 200) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

async function fetchOgData(kind, id, fetchFn) {
  const res = await fetchFn(`${OG_DATA_URL}?kind=${kind}&id=${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ogData ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const fetchArticle = (slug, fetchFn) => fetchOgData("article", slug, fetchFn);
const fetchMarket = (id, fetchFn) => fetchOgData("market", id, fetchFn);

// ── Construction des métadonnées par type de page ─────────────────────────

async function buildMeta(kind, id, fetchFn, opts = {}) {
  const base = { title: DEFAULT_TITLE, description: DEFAULT_DESC, image: DEFAULT_IMAGE, path: "/", type: "website", body: "" };

  if (kind === "blog") {
    return {
      ...base,
      title: "Analyses et actualités | Kassandre",
      description: "Nos analyses sur les prediction markets, l'actualité et les tendances.",
      path: "/blog",
    };
  }

  if (kind === "presidentielle") {
    return {
      ...base,
      title: "Présidentielle 2027 : probabilités et pronostics | Kassandre",
      description:
        "Qui sera au second tour ? Qui entrera à l'Élysée en 2027 ? Les probabilités des membres de Kassandre sur la présidentielle, mises à jour en temps réel.",
      path: "/presidentielle-2027",
    };
  }

  if (kind === "article" && id) {
    const a = await fetchArticle(id, fetchFn);
    if (!a) return { ...base, path: `/blog/${encodeURIComponent(id)}`, debug: "not-found" };
    const text = stripHtml(a.content);
    return {
      title: `${a.title} | Kassandre`,
      description: truncate(stripHtml(a.excerpt) || text || DEFAULT_DESC),
      image: a.coverImageUrl || DEFAULT_IMAGE,
      path: `/blog/${encodeURIComponent(a.slug || id)}`,
      type: "article",
      debug: "ok",
      published: a.publishedAt,
      tags: Array.isArray(a.tags) ? a.tags : [],
      // Contenu complet des articles (écrit par l'admin, même HTML que sur le site)
      body: `<article><h1>${esc(a.title)}</h1>${a.excerpt ? `<p>${esc(a.excerpt)}</p>` : ""}${a.content || ""}</article>`,
    };
  }

  if (kind === "market" && id) {
    const m = await fetchMarket(id, fetchFn);
    if (!m) return { ...base, path: `/market/${encodeURIComponent(id)}`, debug: "not-found" };
    let desc = stripHtml(m.description);
    const options = Array.isArray(m.options) ? m.options.filter((o) => o.label && typeof o.price === "number") : [];
    let probaHtml = "";
    if (m.type === "binary" && m.poolYes > 0 && m.poolNo > 0) {
      const pct = Math.round((m.poolNo / (m.poolYes + m.poolNo)) * 100);
      desc = `${pct}% de probabilité selon les membres de Kassandre.${desc ? " " + desc : ""}`;
      probaHtml = `<p>Probabilité actuelle : Oui ${pct} %, Non ${100 - pct} %.</p>`;
    } else if (options.length > 0) {
      const lead = options[0];
      const leadPct = Math.round(lead.price * 100);
      desc = `Favori actuel : ${lead.label} (${leadPct}%) selon les membres de Kassandre.${desc ? " " + desc : ""}`;
      probaHtml = `<ul>${options.map((o) => `<li>${esc(o.label)} : ${Math.round(o.price * 100)} %</li>`).join("")}</ul>`;
    }
    const statusHtml = m.status && m.status !== "open" ? `<p>Ce marché est ${m.status === "resolved" ? "résolu" : "fermé"}.</p>` : "";
    const dateHtml = m.resolutionDate ? `<p>Date de résolution : ${esc(m.resolutionDate)}.</p>` : "";
    return {
      ...base,
      title: `${m.question} | Kassandre`,
      description: truncate(desc || "Marché de prédiction sur Kassandre : donnez votre pronostic."),
      path: `/market/${encodeURIComponent(id)}`,
      // Image générée pour ce marché (probabilités en direct, pari de la personne
      // qui partage via ?pick=). Voir api/og-image.js.
      image: `${SITE}/api/og-image?id=${encodeURIComponent(id)}${opts.pick ? `&pick=${encodeURIComponent(String(opts.pick).slice(0, 120))}` : ""}`,
      dynamicImage: true,
      debug: "ok",
      body: `<article><h1>${esc(m.question)}</h1>${m.description ? `<p>${esc(stripHtml(m.description))}</p>` : ""}${probaHtml}${statusHtml}${dateHtml}</article>`,
    };
  }

  return base;
}

// ── Injection dans le shell ───────────────────────────────────────────────

function render(shell, meta) {
  const url = `${SITE}${meta.path === "/" ? "" : meta.path}`;
  const isDefaultImage = meta.image === DEFAULT_IMAGE || meta.dynamicImage === true;
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:site_name" content="Kassandre" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:image" content="${esc(meta.image)}" />`,
    isDefaultImage ? `<meta property="og:image:width" content="1200" />` : "",
    isDefaultImage ? `<meta property="og:image:height" content="630" />` : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${esc(meta.image)}" />`,
    meta.published ? `<meta property="article:published_time" content="${esc(meta.published)}" />` : "",
    ...(meta.tags || []).map((t) => `<meta property="article:tag" content="${esc(t)}" />`),
  ]
    .filter(Boolean)
    .join("\n    ");

  let html = shell
    // retire les balises qu'on va remplacer
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+(name|property)=["'](description|og:[^"']*|twitter:[^"']*|article:[^"']*)["'][^>]*>\s*/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(/<html[^>]*>/i, '<html lang="fr">')
    .replace(/<\/head>/i, `    ${tags}\n  </head>`);

  if (meta.body) {
    html = html.replace(/<div id="root">\s*<\/div>/i, `<div id="root">${meta.body}</div>`);
  }
  if (meta.debug) {
    // Statut du rendu (ok, not-found, fallback), visible via "afficher le code source".
    // Le détail d'une erreur n'est jamais exposé ici : il est journalisé côté Vercel.
    html += `\n<!-- og: ${String(meta.debug).replace(/--+/g, "-").replace(/\s+/g, " ")} -->\n`;
  }
  return html;
}

// ── Handler Vercel ────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const url = new URL(req.url, SITE);
  const kind = url.searchParams.get("kind") || "home";
  const id = url.searchParams.get("id") || "";
  const pick = url.searchParams.get("pick") || "";

  let shell;
  try {
    const r = await fetch(`${SITE}/index.html`);
    if (!r.ok) throw new Error(`shell ${r.status}`);
    shell = await r.text();
  } catch {
    // Impossible de récupérer le shell : on laisse le site répondre normalement.
    res.statusCode = 302;
    res.setHeader("Location", `${SITE}/index.html`);
    return res.end();
  }

  let meta;
  try {
    meta = await buildMeta(kind, id, fetch, { pick });
  } catch (e) {
    console.error("og: lookup failed", kind, id, e.message);
    // Balises par défaut, mais on garde l'URL demandée comme canonique
    const requested = kind === "article" ? `/blog/${encodeURIComponent(id)}`
      : kind === "market" ? `/market/${encodeURIComponent(id)}`
      : kind === "blog" ? "/blog" : kind === "presidentielle" ? "/presidentielle-2027" : "/";
    meta = { ...(await buildMeta("home", "", fetch)), path: requested, debug: "fallback" };
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Les robots de partage rappellent souvent : on met en cache côté CDN.
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  res.end(render(shell, meta));
}

export { buildMeta, render };
