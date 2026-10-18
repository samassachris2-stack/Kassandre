import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getPublishedArticles } from "../lib/articles";
import { readingMinutes, tagCounts, matchesQuery } from "../lib/blogUtils";

const PAGE_SIZE = 8;
// En dessous de ce nombre d'articles, la recherche et les thèmes n'apportent rien.
const FILTERS_FROM = 6;

export default function BlogList() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const tag = params.get("tag") || "";

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

  const showFilters = articles.length >= FILTERS_FROM;
  const tags = useMemo(() => tagCounts(articles), [articles]);
  const filtered = useMemo(
    () => articles.filter((a) => (!tag || (a.tags || []).includes(tag)) && matchesQuery(a, search)),
    [articles, tag, search]
  );
  const filtering = Boolean(tag || search.trim());
  // Sans filtre, le plus récent passe en grand ; le reste suit en liste paginée.
  const featured = !filtering ? filtered[0] : null;
  const rest = featured ? filtered.slice(1) : filtered;
  const shown = rest.slice(0, visible);

  function pickTag(t) {
    setVisible(PAGE_SIZE);
    const next = new URLSearchParams(params);
    if (!t || t === tag) next.delete("tag"); else next.set("tag", t);
    setParams(next, { replace: true });
  }

  const renderCard = (article, big = false) => (
    <Link key={article.id} to={`/blog/${article.slug}`} style={{ textDecoration: "none" }}>
      <article className="blog-list-card" style={big ? { ...styles.articleCard, flexDirection: "column", gap: 0 } : styles.articleCard}>
        {article.coverImageUrl && (
          <img loading={big ? "eager" : "lazy"} decoding="async"
            className="blog-list-cover"
            src={article.coverImageUrl}
            alt=""
            style={big ? styles.featuredCover : styles.cover}
          />
        )}
        <div style={styles.cardBody}>
          <div style={styles.articleMeta}>
            <span style={styles.date}>
              {big && <span style={styles.badge}>À la une · </span>}
              {formatDate(article.publishedAt)}
              <span style={styles.readTime}> · {readingMinutes(article.content)} min de lecture</span>
            </span>
            {article.tags && article.tags.length > 0 && (
              <div style={styles.tags}>
                {article.tags.slice(0, 2).map((t) => (
                  <span key={t} style={styles.tag}>{t}</span>
                ))}
              </div>
            )}
          </div>

          <h2 style={big ? styles.featuredTitle : styles.articleTitle}>{article.title}</h2>
          <p style={styles.excerpt}>{article.excerpt}</p>
          <div style={styles.readMore}>Lire l'article →</div>
        </div>
      </article>
    </Link>
  );

  return (
    <div style={styles.container}>
      <style>{`
        @media (max-width: 640px) {
          .blog-list-title { font-size: 1.9rem !important; }
          .blog-list-card { flex-direction: column !important; }
          .blog-list-cover { width: 100% !important; height: 180px !important; }
        }
      `}</style>
      <div style={styles.header}>
        <h1 className="blog-list-title" style={styles.title}>Analyses et actualités</h1>
        <p style={styles.subtitle}>
          Explorez nos analyses sur les prediction markets, l'actualité et les
          tendances
        </p>
      </div>

      {showFilters && (
        <div style={styles.toolbar}>
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE); }}
            placeholder="Rechercher un article, un thème..."
            aria-label="Rechercher un article"
            style={styles.search}
          />
          {tags.length > 0 && (
            <div style={styles.pills}>
              <button style={styles.pill(!tag)} onClick={() => pickTag("")}>Tous</button>
              {tags.slice(0, 12).map(([t, n]) => (
                <button key={t} style={styles.pill(tag === t)} onClick={() => pickTag(t)}>
                  {t}<span style={styles.pillCount}>{n}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <p style={styles.loading}>Chargement des articles...</p>}

      {!loading && articles.length === 0 && (
        <p style={styles.empty}>Aucun article publié pour le moment.</p>
      )}

      {!loading && articles.length > 0 && filtering && (
        <p style={styles.resultCount}>
          {filtered.length} article{filtered.length > 1 ? "s" : ""}
          {tag ? ` sur « ${tag} »` : ""}
        </p>
      )}

      {!loading && articles.length > 0 && filtered.length === 0 && (
        <p style={styles.empty}>Aucun article ne correspond à votre recherche.</p>
      )}

      <div style={styles.articlesList}>
        {featured && renderCard(featured, true)}
        {shown.map((article) => renderCard(article))}
      </div>

      {rest.length > visible && (
        <button style={styles.moreBtn} onClick={() => setVisible((v) => v + PAGE_SIZE)}>
          Voir plus d'articles ({rest.length - visible})
        </button>
      )}
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
    display: "flex",
    gap: "24px",
    backgroundColor: "#1a1a22",
    border: "1px solid #2a2a35",
    borderRadius: "12px",
    overflow: "hidden",
    transition: "all 0.3s ease",
    cursor: "pointer",
  },
  articleCardHover: {
    backgroundColor: "#242430",
    borderColor: "#7c3aed",
    transform: "translateY(-2px)",
  },
  cover: {
    width: "220px",
    height: "auto",
    objectFit: "cover",
    flexShrink: 0,
  },
  cardBody: {
    padding: "28px",
    flex: 1,
    minWidth: 0,
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
  toolbar: { display: "flex", flexDirection: "column", gap: "14px", marginBottom: "36px" },
  search: {
    width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: "10px",
    border: "1px solid #2a2a35", background: "#12121a", color: "#e8e8f0", fontSize: "15px",
  },
  pills: { display: "flex", flexWrap: "wrap", gap: "8px" },
  pill: (active) => ({
    fontSize: "0.85rem", padding: "6px 14px", borderRadius: "20px", cursor: "pointer",
    border: active ? "1px solid #7c3aed" : "1px solid #2a2a35",
    background: active ? "rgba(124,58,237,0.18)" : "transparent",
    color: active ? "#a78bfa" : "#a0a0b0",
  }),
  pillCount: { opacity: 0.6, marginLeft: "6px" },
  featuredCover: { width: "100%", height: "320px", objectFit: "cover", display: "block" },
  featuredTitle: { fontSize: "2rem", fontWeight: "bold", color: "#e8e8f0", margin: "12px 0", lineHeight: "1.3" },
  badge: {
    fontSize: "0.75rem", fontWeight: 600, color: "#7c3aed", textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  readTime: { fontSize: "0.85rem", color: "#8888a0" },
  moreBtn: {
    display: "block", margin: "36px auto 0", padding: "12px 28px", borderRadius: "10px",
    background: "transparent", border: "1px solid #7c3aed", color: "#a78bfa",
    fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
  },
  resultCount: { fontSize: "0.9rem", color: "#8888a0", marginBottom: "20px" },
};
