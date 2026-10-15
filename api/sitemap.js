// Sitemaps XML dynamiques, servis par Vercel (voir les rewrites de vercel.json) :
//   /sitemap.xml          index qui référence les trois fichiers ci-dessous
//   /sitemap-pages.xml    pages fixes et pages de catégories
//   /sitemap-blog.xml     articles publiés
//   /sitemap-markets.xml  marchés ouverts
// Les listes viennent de la Cloud Function publique ogData (l'API REST de
// Firestore est refusée sans jeton App Check).

const SITE = "https://kassandre.app";
const OG_DATA_URL = "https://us-central1-kassandre-f868e.cloudfunctions.net/ogData";

const STATIC_PAGES = ["/", "/blog", "/leaderboard", "/cgu", "/confidentialite", "/mentions-legales"];
const CATEGORIES = ["Sport", "Politique", "Crypto", "Tech", "Économie", "International", "Culture", "Climat", "Autre"];

const xmlEsc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function urlset(entries) {
  const rows = entries.map(
    (e) => `  <url><loc>${xmlEsc(SITE + e.path)}</loc>${e.lastmod ? `<lastmod>${xmlEsc(e.lastmod)}</lastmod>` : ""}</url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}

function sitemapIndex(files) {
  const rows = files.map((f) => `  <sitemap><loc>${xmlEsc(SITE + f)}</loc></sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</sitemapindex>\n`;
}

async function fetchList(kind, fetchFn) {
  const res = await fetchFn(`${OG_DATA_URL}?kind=${kind}`);
  if (!res.ok) throw new Error(`ogData ${kind} ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

export async function buildSitemap(type, fetchFn) {
  switch (type) {
    case "index":
      return sitemapIndex(["/sitemap-pages.xml", "/sitemap-blog.xml", "/sitemap-markets.xml"]);
    case "pages":
      return urlset([
        ...STATIC_PAGES.map((path) => ({ path })),
        ...CATEGORIES.map((c) => ({ path: `/${encodeURIComponent(c)}` })),
      ]);
    case "blog": {
      const items = await fetchList("articles-index", fetchFn);
      return urlset(items.map((a) => ({ path: `/blog/${encodeURIComponent(a.slug)}`, lastmod: a.lastmod })));
    }
    case "markets": {
      const items = await fetchList("markets-index", fetchFn);
      return urlset(items.map((m) => ({ path: `/market/${encodeURIComponent(m.id)}`, lastmod: m.lastmod })));
    }
    default:
      return null;
  }
}

export default async function handler(req, res) {
  const type = new URL(req.url, SITE).searchParams.get("type") || "index";
  try {
    const xml = await buildSitemap(type, fetch);
    if (xml === null) {
      res.statusCode = 404;
      return res.end("Not found");
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.end(xml);
  } catch (e) {
    // Mieux vaut une erreur temporaire qu'un sitemap vide qui ferait croire
    // aux moteurs que le site n'a plus de contenu.
    console.error("sitemap failed", type, e.message);
    res.statusCode = 503;
    res.setHeader("Retry-After", "600");
    res.end("Sitemap temporarily unavailable");
  }
}
