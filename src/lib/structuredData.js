/**
 * Génère du JSON-LD (structured data) pour les articles
 * Aide les moteurs de recherche à comprendre le contenu
 */
export const generateArticleStructuredData = (article) => {
  const baseUrl = 'https://kassandre.app';
  const publishDate = article.publishedAt?.toDate
    ? article.publishedAt.toDate().toISOString()
    : new Date(article.publishedAt).toISOString();

  const modifiedDate = article.updatedAt?.toDate
    ? article.updatedAt.toDate().toISOString()
    : publishDate;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: article.coverImageUrl || `${baseUrl}/og-image.png`,
    datePublished: publishDate,
    dateModified: modifiedDate,
    author: {
      '@type': 'Organization',
      name: 'Kassandre',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Kassandre',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/blog/${article.slug}`,
    },
    keywords: article.tags ? article.tags.join(', ') : 'prediction, market, actualité',
    inLanguage: 'fr-FR',
    articleBody: String(article.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
};

/**
 * Génère JSON-LD pour une page de liste d'articles
 */
export const generateBlogListStructuredData = (articles) => {
  const baseUrl = 'https://kassandre.app';

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Blog Kassandre',
    description: 'Articles d\'analyse et d\'actualité sur les marchés de prédictions',
    url: `${baseUrl}/blog`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: articles.slice(0, 10).map((article, idx) => ({
        '@type': 'BlogPosting',
        position: idx + 1,
        headline: article.title,
        description: article.excerpt,
        url: `${baseUrl}/blog/${article.slug}`,
        image: article.coverImageUrl,
        datePublished: article.publishedAt?.toDate?.().toISOString() || article.publishedAt,
      })),
    },
  };
};

/**
 * Génère JSON-LD pour l'organisation (homepage)
 */
export const generateOrganizationStructuredData = () => {
  const baseUrl = 'https://kassandre.app';

  // Uniquement des informations vérifiables : pas de réseaux sociaux ni de
  // contact inventés (Google traite le balisage inexact comme trompeur).
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'Kassandre',
        description: 'Marché de prédictions francophone en play money',
        url: baseUrl,
        logo: `${baseUrl}/og-image.png`,
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        name: 'Kassandre',
        url: baseUrl,
        inLanguage: 'fr-FR',
        publisher: { '@id': `${baseUrl}/#organization` },
      },
    ],
  };
};

/**
 * Convertit un objet JSON-LD en <script> tag pour React Helmet
 */
export const createStructuredDataScript = (jsonLd) => {
  return JSON.stringify(jsonLd);
};
