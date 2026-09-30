import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getArticleBySlug } from "../lib/articles";

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

  const renderMarkdown = (content) => {
    if (!content) return "";

    // Simple markdown parsing
    let html = content
      // Headers
      .replace(/^### (.*?)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*?)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*?)$/gm, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Line breaks
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br />");

    return html;
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

  return (
    <div style={styles.container}>
      <Link to="/blog" style={styles.backLink}>
        ← Retour aux articles
      </Link>

      <article style={styles.article}>
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

          <h1 style={styles.title}>{article.title}</h1>

          {article.excerpt && (
            <p style={styles.excerpt}>{article.excerpt}</p>
          )}
        </header>

        <div
          style={styles.content}
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(article.content),
          }}
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

    "& h1": {
      fontSize: "2rem",
      fontWeight: "bold",
      marginTop: "32px",
      marginBottom: "16px",
      color: "#e8e8f0",
    },
    "& h2": {
      fontSize: "1.6rem",
      fontWeight: "bold",
      marginTop: "28px",
      marginBottom: "14px",
      color: "#e8e8f0",
    },
    "& h3": {
      fontSize: "1.3rem",
      fontWeight: "bold",
      marginTop: "24px",
      marginBottom: "12px",
      color: "#e8e8f0",
    },
    "& p": {
      marginBottom: "16px",
    },
    "& strong": {
      fontWeight: "bold",
      color: "#e8e8f0",
    },
    "& a": {
      color: "#7c3aed",
      textDecoration: "underline",
    },
    "& em": {
      fontStyle: "italic",
    },
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
