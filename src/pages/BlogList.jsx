import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPublishedArticles } from "../lib/articles";

export default function BlogList() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      const data = await getPublishedArticles();
      setArticles(data);
      setLoading(false);
    };

    fetchArticles();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Analyses et actualités</h1>
        <p style={styles.subtitle}>
          Explorez nos analyses sur les prediction markets, l'actualité et les
          tendances
        </p>
      </div>

      {loading && <p style={styles.loading}>Chargement des articles...</p>}

      {!loading && articles.length === 0 && (
        <p style={styles.empty}>Aucun article publié pour le moment.</p>
      )}

      <div style={styles.articlesList}>
        {articles.map((article) => (
          <Link
            key={article.id}
            to={`/blog/${article.slug}`}
            style={{ textDecoration: "none" }}
          >
            <article style={styles.articleCard}>
              <div style={styles.articleMeta}>
                <span style={styles.date}>
                  {formatDate(article.publishedAt)}
                </span>
                {article.tags && article.tags.length > 0 && (
                  <div style={styles.tags}>
                    {article.tags.slice(0, 2).map((tag) => (
                      <span key={tag} style={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <h2 style={styles.articleTitle}>{article.title}</h2>

              <p style={styles.excerpt}>{article.excerpt}</p>

              <div style={styles.readMore}>Lire l'article →</div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "40px 20px",
    minHeight: "calc(100vh - 200px)",
  },
  header: {
    marginBottom: "60px",
    textAlign: "center",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: "#e8e8f0",
    marginBottom: "12px",
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "#a0a0b0",
    margin: 0,
  },
  loading: {
    color: "#a0a0b0",
    textAlign: "center",
    padding: "40px 0",
  },
  empty: {
    color: "#a0a0b0",
    textAlign: "center",
    padding: "40px 0",
  },
  articlesList: {
    display: "flex",
    flexDirection: "column",
    gap: "32px",
  },
  articleCard: {
    padding: "28px",
    backgroundColor: "#1a1a22",
    border: "1px solid #2a2a35",
    borderRadius: "12px",
    transition: "all 0.3s ease",
    cursor: "pointer",
  },
  articleCardHover: {
    backgroundColor: "#242430",
    borderColor: "#7c3aed",
    transform: "translateY(-2px)",
  },
  articleMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "12px",
  },
  date: {
    fontSize: "0.9rem",
    color: "#7c3aed",
    fontWeight: "500",
  },
  tags: {
    display: "flex",
    gap: "8px",
  },
  tag: {
    fontSize: "0.8rem",
    color: "#a0a0b0",
    backgroundColor: "#0a0a0f",
    padding: "4px 12px",
    borderRadius: "4px",
    border: "1px solid #2a2a35",
  },
  articleTitle: {
    fontSize: "1.6rem",
    fontWeight: "bold",
    color: "#e8e8f0",
    margin: "12px 0",
    lineHeight: "1.4",
  },
  excerpt: {
    fontSize: "1rem",
    color: "#b0b0c0",
    margin: "12px 0",
    lineHeight: "1.6",
  },
  readMore: {
    fontSize: "0.95rem",
    color: "#7c3aed",
    fontWeight: "500",
    marginTop: "16px",
  },
};
