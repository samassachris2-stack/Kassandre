import { Helmet } from 'react-helmet-async';

export const useSEO = ({
  title,
  description,
  image,
  url,
  type = 'website',
  author,
  publishedDate,
  updatedDate,
  tags = [],
  structuredData = null
}) => {
  const siteTitle = 'Kassandre';
  const siteUrl = 'https://kassandre.app';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl;
  const defaultImage = `${siteUrl}/og-image.png`;
  const imageUrl = image || defaultImage;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <meta charSet="utf-8" />
      <title>{fullTitle}</title>
      <meta name="description" content={description || 'Marché de prédictions francophone où analyser l\'actualité et parier sur les événements qui comptent.'} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || 'Marché de prédictions francophone'} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content={siteTitle} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || 'Marché de prédictions francophone'} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Canonical */}
      <link rel="canonical" href={fullUrl} />

      {/* Article specific */}
      {type === 'article' && publishedDate && (
        <meta property="article:published_time" content={publishedDate} />
      )}
      {type === 'article' && updatedDate && (
        <meta property="article:modified_time" content={updatedDate} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}
      {type === 'article' && tags.length > 0 && (
        tags.map((tag, idx) => (
          <meta key={idx} property="article:tag" content={tag} />
        ))
      )}

      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="French" />
      <meta name="author" content="Kassandre" />

      {/* Favicon */}
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

      {/* JSON-LD Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};
