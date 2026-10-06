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
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt,
    image: article.coverImageUrl || `${baseUrl}/og-image.png`,
    datePublished: publishDate,
    dateModified: modifiedDate,
    author: {
      '@type': 'Organization',
      name: 'Kassandre',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
        width: 250,
        height: 250,
      },
    },
    publisher: {
      '@type': 'Organization',
      name: 'Kassandre',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
        width: 250,
        height: 250,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/blog/${article.slug}`,
    },
    keywords: article.tags ? article.tags.join(', ') : 'prediction, market, actualité',
    articleBody: article.content,
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

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kassandre',
    description: 'Marché de prédictions francophone en play money',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [
      'https://twitter.com/kassandre',
      'https://github.com/samassachris2-stack/Kassandre',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '',
      contactType: 'Customer Service',
    },
  };
};

/**
 * Convertit un objet JSON-LD en <script> tag pour React Helmet
 */
export const createStructuredDataScript = (jsonLd) => {
  return JSON.stringify(jsonLd);
};
