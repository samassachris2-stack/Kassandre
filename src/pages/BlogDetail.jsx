import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getArticleBySlug } from "../lib/articles";
import { useSEO } from "../hooks/useSEO";
import { generateArticleStructuredData } from "../lib/structuredData";
import ShareButtons from "../components/ShareButtons";

export default function BlogDetail() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      const data = await getArticleBySlug(slug);
      if (data) {
        setArticle(data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };

    fetchArticle();
  }, [slug]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.loading}>Chargement de l'article...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={styles.container}>
        <p style={styles.notFound}>Article non trouvé.</p>
        <Link to="/blog" style={styles.backLink}>
          Retour aux articles
        </Link>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  // SEO
  useSEO({
    title: article.title,
    description: article.excerpt,
    image: article.coverImageUrl,
    url: `/blog/${article.slug}`,
    type: 'article',
    publishedDate: article.publishedAt?.toDate?.().toISOString() || article.publishedAt,
    updatedDate: article.updatedAt?.toDate?.().toISOString(),
    tags: article.tags || [],
    author: 'Kassandre',
    structuredData: generateArticleStructuredData(article),
  });

  // Apply data-width styles to images (for custom image widths)
  useEffect(() => {
    const contentDiv = document.querySelector('.blog-article-body');
    if (!contentDiv) return;

    const images = contentDiv.querySelectorAll('img[data-width]');
    images.forEach((img) => {
      const width = img.getAttribute('data-width');
      if (width) {
        img.style.width = `${width}px`;
      }
    });
  }, [article.id]);

  return (
    <div style={styles.container}>
      <style>{`
        .blog-article-body h2 {
          font-size: 1.6rem;
          font-weight: 700;
          color: #e8e8f0;
          margin: 28px 0 14px 0;
        }
        .blog-article-body h3 {
          font-size: 1.3rem;
          font-weight: 700;
          color: #e8e8f0;
          margin: 24px 0 12px 0;
        }
        .blog-article-body p {
          margin: 0 0 16px 0;
        }
        .blog-article-body ul,
        .blog-article-body ol {
          padding-left: 24px;
          margin: 0 0 16px 0;
        }
        .blog-article-body strong { color: #e8e8f0; font-weight: 700; }
        .blog-article-body em { font-style: italic; }
        .blog-article-body u { text-decoration: underline; }
        .blog-article-body a { color: #a78bfa; text-decoration: underline; }
        .blog-article-body blockquote {
          border-left: 3px solid #7c3aed;
          margin: 20px 0;
          padding: 4px 20px;
          color: #a0a0b0;
          font-style: italic;
        }
        .blog-article-body pre {
          background: #0a0a0f;
          border: 1px solid #2a2a35;
          border-radius: 6px;
          padding: 14px 18px;
          overflow-x: auto;
          margin: 20px 0;
        }
        .blog-article-body code {
          background: #0a0a0f;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .blog-article-body hr {
          border: none;
          border-top: 1px solid #2a2a35;
          margin: 28px 0;
        }
        .blog-article-body img {
          max-width: 100%;
          border-radius: 8px;
        }
        .blog-article-body img {
          border-radius: 8px;
        }
        .blog-article-body img:not([data-width]) {
          width: min(640px, 100%);
        }
        .blog-article-body img[data-width] {
          max-width: 100%;
        }
        .blog-article-body img[data-align="left"] {
          float: left;
          margin: 4px 20px 12px 0;
        }
        .blog-article-body img[data-align="right"] {
          float: right;
          margin: 4px 0 12px 20px;
        }
        .blog-article-body img[data-align="center"] {
          display: block;
          margin: 20px auto;
        }
        .blog-article-body img:not([data-align]) {
          display: block;
          margin: 20px 0;
        }
        .blog-article-body::after {
          content: '';
          display: table;
          clear: both;
        }
        @media (max-width: 640px) {
          .blog-article-wrap { padding: 24px 18px !important; }
          .blog-article-title { font-size: 1.7rem !important; }
          /* Une image "flottante" avec du texte qui s'enroule autour marche
             bien sur un large écran, mais sur un téléphone étroit elle
             écraserait le texte en une colonne minuscule. On repasse toutes
             les images en pleine largeur, empilées avec le texte. */
          .blog-article-body img[data-align="left"],
          .blog-article-body img[data-align="right"] {
            float: none;
            display: block;
            width: 100% !important;
            margin: 16px 0;
          }
        }
      `}</style>

      <Link to="/blog" style={styles.backLink}>
        ← Retour aux articles
      </Link>

      <article className="blog-article-wrap" style={styles.article}>
        <header style={styles.header}>
          <div style={styles.meta}>
            <span style={styles.date}>
              {formatDate(article.publishedAt)}
            </span>
            {article.tags && article.tags.length > 0 && (
              <div style={styles.tags}>
                {article.tags.map((tag) => (
                  <span key={tag} style={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <h1 className="blog-article-title" style={styles.title}>{article.title}</h1>

          {article.excerpt && (
            <p style={styles.excerpt}>{article.excerpt}</p>
          )}
        </header>

        {article.coverImageUrl && (
          <img
            src={article.coverImageUrl}
            alt=""
            style={styles.coverImage}
          />
        )}

        <div
          className="blog-article-body"
          style={styles.content}
          dangerouslySetInnerHTML={{
            __html: article.content,
          }}
        />

        <ShareButtons
          title={article.title}
          url={`/blog/${article.slug}`}
          excerpt={article.excerpt}
        />

        {article.linkedMarkets && article.linkedMarkets.length > 0 && (
          <section style={styles.marketsSection}>
            <h3 style={styles.marketsTitle}>Markets liés</h3>
            <div style={styles.marketsList}>
              {article.linkedMarkets.map((marketId) => (
                <Link
                  key={marketId}
                  to={`/market/${marketId}`}
                  style={styles.marketLink}
                >
                  Voir le market →
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "40px 20px",
    minHeight: "calc(100vh - 200px)",
  },
  backLink: {
    color: "#7c3aed",
    textDecoration: "none",
    fontSize: "1rem",
    marginBottom: "40px",
    display: "inline-block",
    transition: "opacity 0.2s",
  },
  loading: {
    color: "#a0a0b0",
    textAlign: "center",
    padding: "40px 0",
  },
  notFound: {
    color: "#a0a0b0",
    textAlign: "center",
    padding: "40px 0",
  },
  article: {
    backgroundColor: "#1a1a22",
    padding: "40px",
    borderRadius: "12px",
    border: "1px solid #2a2a35",
  },
  coverImage: {
    display: "block",
    width: "100%",
    maxHeight: "420px",
    objectFit: "cover",
    borderRadius: "10px",
    margin: "0 0 32px 0",
  },
  header: {
    marginBottom: "40px",
    paddingBottom: "32px",
    borderBottom: "1px solid #2a2a35",
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "16px",
  },
  date: {
    fontSize: "1rem",
    color: "#7c3aed",
    fontWeight: "500",
  },
  tags: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  tag: {
    fontSize: "0.9rem",
    color: "#a0a0b0",
    backgroundColor: "#0a0a0f",
    padding: "6px 14px",
    borderRadius: "4px",
    border: "1px solid #2a2a35",
  },
  title: {
    fontSize: "2.4rem",
    fontWeight: "bold",
    color: "#e8e8f0",
    margin: "16px 0",
    lineHeight: "1.3",
  },
  excerpt: {
    fontSize: "1.15rem",
    color: "#b0b0c0",
    margin: "16px 0 0 0",
    fontStyle: "italic",
  },
  content: {
    fontSize: "1.05rem",
    lineHeight: "1.8",
    color: "#d0d0e0",
    marginBottom: "40px",
  },
  marketsSection: {
    borderTop: "1px solid #2a2a35",
    paddingTop: "32px",
  },
  marketsTitle: {
    fontSize: "1.3rem",
    fontWeight: "bold",
    color: "#e8e8f0",
    marginBottom: "16px",
  },
  marketsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  marketLink: {
    color: "#7c3aed",
    textDecoration: "none",
    fontSize: "1rem",
    padding: "12px",
    backgroundColor: "#0a0a0f",
    borderRadius: "6px",
    border: "1px solid #2a2a35",
    transition: "all 0.2s",
    display: "inline-block",
  },
};
