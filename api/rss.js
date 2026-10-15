// Flux RSS du blog (/rss.xml, voir vercel.json). Même source que le sitemap :
// la Cloud Function publique ogData (liste "articles-index").

const SITE = "https://kassandre.app";
const OG_DATA_URL = "https://us-central1-kassandre-f868e.cloudfunctions.net/ogData";
const MAX_ITEMS = 50;

const xmlEsc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function buildRss(items) {
  const sorted = [...items]
    .filter((a) => a.slug && a.title)
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
    .slice(0, MAX_ITEMS);

  const rows = sorted.map((a) => {
    const url = `${SITE}/blog/${encodeURIComponent(a.slug)}`;
    const date = a.publishedAt ? new Date(a.publishedAt).toUTCString() : null;
    return `    <item>
      <title>${xmlEsc(a.title)}</title>
      <link>${xmlEsc(url)}</link>
      <guid isPermaLink="true">${xmlEsc(url)}</guid>${date ? `\n      <pubDate>${date}</pubDate>` : ""}
      <description>${xmlEsc(a.excerpt)}</description>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kassandre : analyses et actualités</title>
    <link>${SITE}/blog</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Analyses sur l'actualité et les marchés de prédiction francophones.</description>
    <language>fr-FR</language>
${rows.join("\n")}
  </channel>
</rss>
`;
}

export default async function handler(req, res) {
  try {
    const r = await fetch(`${OG_DATA_URL}?kind=articles-index`);
    if (!r.ok) throw new Error(`ogData ${r.status}`);
    const data = await r.json();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
    res.end(buildRss(Array.isArray(data.items) ? data.items : []));
  } catch (e) {
    console.error("rss failed", e.message);
    res.statusCode = 503;
    res.setHeader("Retry-After", "600");
    res.end("Feed temporarily unavailable");
  }
}
