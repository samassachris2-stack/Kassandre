import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getPublishedArticles } from "../lib/articles";
import { readingMinutes, tagCounts, matchesQuery } from "../lib/blogUtils";
import { cssUrl } from "../lib/cssUrl";

const PAGE_SIZE = 12;
const TAGS_SHOWN = 8;
// En dessous de ce nombre d'articles, la recherche et les thèmes n'apportent rien.
const FILTERS_FROM = 6;
const OPINION_TAGS = ["tribune", "opinion", "édito", "edito"];

const toDate = (ts) => {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
};

function dateLabel(ts) {
  const d = toDate(ts);
  if (!d) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function monthLabel(ts) {
  const d = toDate(ts);
  if (!d) return "Sans date";
  const s = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const isOpinion = (a) => (a.tags || []).some((t) => OPINION_TAGS.includes(String(t).toLowerCase()));

function minutesOf(a) {
  return a.readingTime || readingMinutes(a.content);
}

export default function BlogList() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [allTags, setAllTags] = useState(false);
  const tag = params.get("tag") || "";
  const search = params.get("q") || "";
  const sort = params.get("sort") || "recent";

  useEffect(() => {
    let alive = true;
    getPublishedArticles().then((data) => {
      if (!alive) return;
      setArticles(data);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  function setParam(name, value) {
    setVisible(PAGE_SIZE);
    const next = new URLSearchParams(params);
    if (!value || (name === "sort" && value === "recent")) next.delete(name); else next.set(name, value);
    setParams(next, { replace: true });
  }

  const showFilters = articles.length >= FILTERS_FROM;
  const tags = useMemo(() => tagCounts(articles), [articles]);
  const filtering = Boolean(tag || search.trim());

  const filtered = useMemo(() => {
    const list = articles.filter((a) => (!tag || (a.tags || []).includes(tag)) && matchesQuery(a, search));
    if (sort === "old") return [...list].reverse();
    if (sort === "short") return [...list].sort((a, b) => minutesOf(a) - minutesOf(b));
    return list;
  }, [articles, tag, search, sort]);

  // Mise en avant : seulement sans filtre et en tri « récents ».
  const showHero = !filtering && sort === "recent" && filtered.length >= 4;
  const hero = showHero ? filtered[0] : null;
  const side = showHero ? filtered.slice(1, 4) : [];
  const rest = showHero ? filtered.slice(4) : filtered;
  const shown = rest.slice(0, visible);

  // Regroupement par mois quand on parcourt par date.
  const groups = useMemo(() => {
    if (sort === "short") return [{ label: "", items: shown }];
    const out = [];
    shown.forEach((a) => {
      const label = monthLabel(a.publishedAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(a); else out.push({ label, items: [a] });
    });
    return out;
  }, [shown, sort]);

  const tagList = allTags ? tags : tags.slice(0, TAGS_SHOWN);
  // Si le thème choisi est hors de la liste réduite, on l'ajoute pour qu'il reste visible.
  const tagListShown = tag && !tagList.some(([t]) => t === tag)
    ? [...tagList, [tag, tags.find(([t]) => t === tag)?.[1] || 0]]
    : tagList;

  return (
    <div style={S.container}>
      <style>{CSS}</style>

      <header style={S.header}>
        <h1 className="bl-title" style={S.title}>Analyses et actualités</h1>
        <p style={S.subtitle}>Décryptages, enquêtes et points de vue sur l'actualité et les prédictions.</p>
        <div style={S.headerMeta}>
          {articles.length > 0 && <span>{articles.length} article{articles.length > 1 ? "s" : ""}</span>}
          <a href="/rss.xml" style={S.rss}>Flux RSS</a>
        </div>
      </header>

      {showFilters && (
        <div style={S.toolbar}>
          <div style={S.searchRow}>
            <input
              type="search"
              value={search}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder="Rechercher un article, un thème..."
              aria-label="Rechercher un article"
              style={S.search}
            />
            <select value={sort} onChange={(e) => setParam("sort", e.target.value)} aria-label="Trier" style={S.select}>
              <option value="recent">Plus récents</option>
              <option value="old">Plus anciens</option>
              <option value="short">Lecture courte</option>
            </select>
          </div>
          {tags.length > 0 && (
            <div className="bl-pills" style={S.pills}>
              <button style={S.pill(!tag)} onClick={() => setParam("tag", "")}>Tous</button>
              {tagListShown.map(([t, n]) => (
                <button key={t} style={S.pill(tag === t)} onClick={() => setParam("tag", tag === t ? "" : t)}>
                  {t}<span style={S.pillCount}>{n}</span>
                </button>
              ))}
              {tags.length > TAGS_SHOWN && (
                <button style={S.pillMore} onClick={() => setAllTags((v) => !v)}>
                  {allTags ? "Moins de thèmes" : `+ ${tags.length - TAGS_SHOWN} thèmes`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="bl-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="bl-skel" />)}
        </div>
      )}

      {!loading && articles.length === 0 && <p style={S.empty}>Aucun article publié pour le moment.</p>}

      {!loading && articles.length > 0 && filtering && (
        <p style={S.resultCount}>
          {filtered.length} article{filtered.length > 1 ? "s" : ""}
          {tag ? ` sur « ${tag} »` : ""}{search.trim() ? ` pour « ${search.trim()} »` : ""}
          <button style={S.reset} onClick={() => setParams({}, { replace: true })}>Effacer les filtres</button>
        </p>
      )}

      {!loading && articles.length > 0 && filtered.length === 0 && (
        <p style={S.empty}>Aucun article ne correspond à votre recherche.</p>
      )}

      {hero && (
        <section className="bl-hero" aria-label="À la une">
          <Link to={`/blog/${hero.slug}`} className="bl-hero-main" style={{
            background: hero.coverImageUrl
              ? `linear-gradient(to top, rgba(var(--k-bg-rgb),0.96) 12%, rgba(var(--k-bg-rgb),0.35) 70%), ${cssUrl(hero.coverImageUrl)} center / cover no-repeat`
              : "linear-gradient(135deg, var(--k-accent-deep), var(--k-bg))",
          }}>
            <div style={S.heroBody}>
              <div style={S.heroBadges}>
                <span style={S.badge}>À la une</span>
                {isOpinion(hero) && <span style={S.badgeOpinion}>Tribune</span>}
              </div>
              <h2 className="bl-hero-title" style={S.heroTitle}>{hero.title}</h2>
              <p style={S.heroExcerpt}>{hero.excerpt}</p>
              <span style={S.meta}>{dateLabel(hero.publishedAt)} · {minutesOf(hero)} min de lecture</span>
            </div>
          </Link>
          <div className="bl-side">
            <div style={S.sideTitle}>Derniers articles</div>
            {side.map((a) => (
              <Link key={a.id} to={`/blog/${a.slug}`} className="bl-side-item">
                {a.coverImageUrl
                  ? <img src={a.coverImageUrl} alt="" loading="lazy" decoding="async" style={S.sideImg} />
                  : <div style={{ ...S.sideImg, background: "linear-gradient(135deg,var(--k-accent-deep),var(--k-inset))" }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={S.sideItemTitle}>{a.title}</div>
                  <div style={S.metaSmall}>{dateLabel(a.publishedAt)} · {minutesOf(a)} min</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {groups.map((g) => (
        <section key={g.label || "all"} style={{ marginBottom: "28px" }}>
          {g.label && <h2 style={S.month}>{g.label}</h2>}
          <div className="bl-grid">
            {g.items.map((a) => (
              <Link key={a.id} to={`/blog/${a.slug}`} className="bl-card">
                <div className="bl-cover" style={{ background: a.coverImageUrl ? undefined : "linear-gradient(135deg,var(--k-accent-deep),var(--k-inset))" }}>
                  {a.coverImageUrl && <img src={a.coverImageUrl} alt="" loading="lazy" decoding="async" />}
                  {isOpinion(a) && <span style={S.cardBadge}>Tribune</span>}
                </div>
                <div style={S.cardBody}>
                  <div style={S.metaSmall}>{dateLabel(a.publishedAt)} · {minutesOf(a)} min de lecture</div>
                  <h3 style={S.cardTitle}>{a.title}</h3>
                  <p style={S.cardExcerpt}>{a.excerpt}</p>
                  {(a.tags || []).length > 0 && (
                    <div style={S.cardTags}>
                      {a.tags.filter((t) => !OPINION_TAGS.includes(String(t).toLowerCase())).slice(0, 2).map((t) => (
                        <span key={t} style={S.tag}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {rest.length > visible && (
        <button style={S.moreBtn} onClick={() => setVisible((v) => v + PAGE_SIZE)}>
          Voir plus d'articles ({rest.length - visible})
        </button>
      )}
    </div>
  );
}

const CSS = `
  .bl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .bl-card { display: flex; flex-direction: column; background: var(--k-surface); border: 1px solid var(--k-border); border-radius: 12px; overflow: hidden; text-decoration: none; transition: border-color .2s, transform .2s; }
  .bl-card:hover { border-color: var(--k-accent); transform: translateY(-2px); }
  .bl-cover { position: relative; aspect-ratio: 16 / 9; overflow: hidden; }
  .bl-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .bl-skel { height: 280px; border-radius: 12px; background: linear-gradient(90deg,var(--k-surface),var(--k-surface2),var(--k-surface)); background-size: 200% 100%; animation: blskel 1.4s infinite; }
  @keyframes blskel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  .bl-hero { display: grid; grid-template-columns: 1.7fr 1fr; gap: 18px; margin-bottom: 40px; }
  .bl-hero-main { display: flex; align-items: flex-end; min-height: 380px; border-radius: 14px; overflow: hidden; text-decoration: none; border: 1px solid var(--k-border); }
  .bl-hero-main:hover { border-color: var(--k-accent); }
  .bl-side { display: flex; flex-direction: column; gap: 4px; background: var(--k-surface); border: 1px solid var(--k-border); border-radius: 14px; padding: 16px; }
  .bl-side-item { display: flex; gap: 12px; padding: 10px 0; border-top: 1px solid var(--k-surface2); text-decoration: none; align-items: center; }
  .bl-side-item:first-of-type { border-top: none; }
  .bl-side-item:hover div:first-child { color: var(--k-accent-text); }
  .bl-pills { overflow-x: auto; }
  @media (max-width: 900px) {
    .bl-grid { grid-template-columns: repeat(2, 1fr); }
    .bl-hero { grid-template-columns: 1fr; }
    .bl-hero-main { min-height: 300px; }
  }
  @media (max-width: 600px) {
    .bl-grid { grid-template-columns: 1fr; }
    .bl-title { font-size: 1.9rem !important; }
    .bl-hero-title { font-size: 1.4rem !important; }
    .bl-pills { flex-wrap: nowrap !important; padding-bottom: 6px; }
    .bl-pills button { flex-shrink: 0; white-space: nowrap; }
  }
`;

const S = {
  container: { maxWidth: "1100px", margin: "0 auto", padding: "40px 20px", minHeight: "calc(100vh - 200px)" },
  header: { marginBottom: "32px", textAlign: "center" },
  title: { fontSize: "2.5rem", fontWeight: "bold", color: "var(--k-text)", marginBottom: "10px" },
  subtitle: { fontSize: "1.05rem", color: "var(--k-muted2)", margin: 0 },
  headerMeta: { display: "flex", justifyContent: "center", gap: "14px", marginTop: "12px", fontSize: "0.85rem", color: "var(--k-muted)" },
  rss: { color: "var(--k-accent-text)", textDecoration: "none" },
  toolbar: { display: "flex", flexDirection: "column", gap: "14px", marginBottom: "32px" },
  searchRow: { display: "flex", gap: "10px" },
  search: {
    flex: 1, minWidth: 0, boxSizing: "border-box", padding: "12px 16px", borderRadius: "10px",
    border: "1px solid var(--k-border)", background: "var(--k-surface)", color: "var(--k-text)", fontSize: "15px",
  },
  select: {
    padding: "0 12px", borderRadius: "10px", border: "1px solid var(--k-border)", background: "var(--k-surface)",
    color: "var(--k-text)", fontSize: "14px",
  },
  pills: { display: "flex", flexWrap: "wrap", gap: "8px" },
  pill: (active) => ({
    fontSize: "0.85rem", padding: "6px 14px", borderRadius: "20px", cursor: "pointer",
    border: active ? "1px solid var(--k-accent)" : "1px solid var(--k-border)",
    background: active ? "rgba(var(--k-accent-rgb),0.18)" : "transparent",
    color: active ? "var(--k-accent-text)" : "var(--k-muted2)",
  }),
  pillMore: {
    fontSize: "0.85rem", padding: "6px 14px", borderRadius: "20px", cursor: "pointer",
    border: "1px dashed var(--k-border2)", background: "transparent", color: "var(--k-muted)",
  },
  pillCount: { opacity: 0.6, marginLeft: "6px" },
  empty: { color: "var(--k-muted2)", textAlign: "center", padding: "40px 0" },
  resultCount: { fontSize: "0.9rem", color: "var(--k-muted)", marginBottom: "20px" },
  reset: {
    marginLeft: "12px", background: "none", border: "none", color: "var(--k-accent-text)", cursor: "pointer",
    fontSize: "0.9rem", textDecoration: "underline",
  },
  heroBody: { padding: "28px", width: "100%", boxSizing: "border-box" },
  heroBadges: { display: "flex", gap: "8px", marginBottom: "12px" },
  badge: {
    fontSize: "0.72rem", fontWeight: 700, color: "#fff", background: "var(--k-accent)", borderRadius: "6px",
    padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.06em",
  },
  badgeOpinion: {
    fontSize: "0.72rem", fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.16)",
    borderRadius: "6px", padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.06em",
  },
  heroTitle: { fontSize: "1.9rem", fontWeight: "bold", color: "#fff", margin: "0 0 10px", lineHeight: 1.25 },
  heroExcerpt: {
    fontSize: "1rem", color: "var(--k-text2)", margin: "0 0 12px", lineHeight: 1.55,
    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  meta: { fontSize: "0.85rem", color: "var(--k-muted2)" },
  sideTitle: { fontSize: "0.8rem", fontWeight: 700, color: "var(--k-accent-text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" },
  sideImg: { width: "84px", height: "64px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 },
  sideItemTitle: {
    fontSize: "0.92rem", fontWeight: 600, color: "var(--k-text)", lineHeight: 1.35, marginBottom: "4px",
    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  metaSmall: { fontSize: "0.78rem", color: "var(--k-muted)" },
  month: { fontSize: "1.1rem", fontWeight: 700, color: "var(--k-text)", margin: "0 0 14px", paddingBottom: "8px", borderBottom: "1px solid var(--k-surface2)" },
  cardBadge: {
    position: "absolute", top: "10px", left: "10px", fontSize: "0.7rem", fontWeight: 700, color: "#f59e0b",
    background: "rgba(var(--k-bg-rgb),0.85)", borderRadius: "6px", padding: "3px 9px", textTransform: "uppercase", letterSpacing: "0.06em",
  },
  cardBody: { padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 },
  cardTitle: {
    fontSize: "1.05rem", fontWeight: 700, color: "var(--k-text)", margin: 0, lineHeight: 1.35,
    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  cardExcerpt: {
    fontSize: "0.88rem", color: "var(--k-muted2)", margin: 0, lineHeight: 1.5,
    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  cardTags: { display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto", paddingTop: "4px" },
  tag: { fontSize: "0.74rem", color: "var(--k-muted2)", background: "var(--k-bg)", padding: "3px 10px", borderRadius: "4px", border: "1px solid var(--k-border)" },
  moreBtn: {
    display: "block", margin: "28px auto 0", padding: "12px 28px", borderRadius: "10px",
    background: "transparent", border: "1px solid var(--k-accent)", color: "var(--k-accent-text)",
    fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
  },
};
