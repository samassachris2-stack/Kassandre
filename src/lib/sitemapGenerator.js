import { getPublishedArticles } from './articles';

/**
 * Génère un sitemap XML pour les articles du blog
 * À appeler côté serveur (Node.js/Firebase Functions) ou via une route API
 */
export const generateBlogSitemap = async () => {
  const articles = await getPublishedArticles();
  const baseUrl = 'https://kassandre.app';

  const xmlEntries = articles.map((article) => {
    const lastmod = article.updatedAt || article.publishedAt;
    const lastmodStr = lastmod?.toDate
      ? lastmod.toDate().toISOString().split('T')[0]
      : new Date(lastmod).toISOString().split('T')[0];

    return `  <url>
    <loc>${baseUrl}/blog/${article.slug}</loc>
    <lastmod>${lastmodStr}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${xmlEntries}
</urlset>`;

  return sitemap;
};

/**
 * Génère un sitemap index pour les sitemaps multiples
 */
export const generateSitemapIndex = () => {
  const baseUrl = 'https://kassandre.app';
  const today = new Date().toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-blog.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-markets.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
};
