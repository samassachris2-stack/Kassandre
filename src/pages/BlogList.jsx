import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { fetchPublishedArticles } from "../lib/articles";
import {
  readingMinutes,
  tagCounts,
  matchesQuery,
  findCategory,
  categoryCounts,
  categorySlug,
  withFeaturedFirst,
  sameTag,
  tagKey,
} from "../lib/blogUtils";
import { cssUrl } from "../lib/cssUrl";
import { useSEO } from "../hooks/useSEO";

const PAGE_SIZE = 12;
const TAGS_SHOWN = 8;
// En dessous de ce nombre d'articles, la recherche et les thèmes n'apportent rien.
const FILTERS_FROM = 6;
const OPINION_TAGS = ["tribune", "opinion", "édito", "edito"];
// Sections par thème sur la page d'accueil du blog.
const SECTIONS_MAX = 4;
const SECTION_SIZE = 3;
// Thèmes affichés par défaut dans la colonne « Suivre des thèmes ».
const FOLLOW_SHOWN = 8;

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

// Thèmes suivis : enregistrés dans ce navigateur (pas de compte nécessaire).
const FOLLOW_KEY = "kassandre_blog_follow";
function readFollowed() {
  try {
    const v = JSON.parse(localStorage.getItem(FOLLOW_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// Une carte d'article (utilisée dans les sections par thème et dans la liste).
function BlogCard({ a }) {
  return (
    <Link to={`/blog/${a.slug}`} className="bl-card">
      <div className="bl-cover" style={{ background: a.coverImageUrl ? undefined : "linear-gradient(135deg,var(--k-accent-deep),var(--k-inset))" }}>
        {a.coverImageUrl && <img src={a.coverImageUrl} alt="" loading="lazy" decoding="async" />}
        {isOpinion(a) && <span style={S.cardBadge}>Tribune</span>}
      </div>
      <div style={S.cardBody}>
        <div style={S.metaSmall}>{dateLabel(a.publishedAt)} · {minutesOf(a)} min de lecture</div>
        {a.category && <span style={S.catLabel}>{a.category}</span>}
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
  );
}

export default function BlogList() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [params, setParams] = useSearchParams();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [allTags, setAllTags] = useState(false);
  const { cat } = useParams();
  // Page de rubrique : /blog/categorie/:cat. Une rubrique inconnue ne renvoie aucun article.
  const category = cat ? findCategory(cat) : null;
  const unknownCategory = Boolean(cat) && !category;
  const tag = params.get("tag") || "";
  const search = params.get("q") || "";
  const sort = params.get("sort") || "recent";

  useEffect(() => {
    let alive = true;
    fetchPublishedArticles()
      .then((data) => {
        if (alive) setArticles(data);
      })
      .catch((e) => {
        console.error("Chargement du blog impossible :", e);
        if (alive) setLoadError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
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

  // Thèmes suivis (clés normalisées), mémorisés dans le navigateur.
  const [followed, setFollowed] = useState(() => readFollowed());
  const [followAll, setFollowAll] = useState(false);
  const toggleFollow = (label) => {
    const k = tagKey(label);
    setFollowed((prev) => {
      const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
      try { localStorage.setItem(FOLLOW_KEY, JSON.stringify(next)); } catch { /* navigation privée : pas de mémoire */ }
      return next;
    });
  };
  const catCounts = useMemo(() => categoryCounts(articles), [articles]);
  const filtering = Boolean(tag || search.trim() || category);

  const seo = useSEO({
    title: category ? `Rubrique ${category}` : "Blog",
    description: category
      ? `Analyses et actualités de la rubrique ${category} sur Kassandre.`
      : "Analyses, décryptages et actualités autour des marchés de prédiction.",
    url: category ? `/blog/categorie/${categorySlug(category)}` : "/blog",
  });

  const filtered = useMemo(() => {
    const list = articles.filter((a) =>
      (!category || findCategory(a.category) === category) &&
      (!tag || (a.tags || []).some((t) => sameTag(t, tag))) &&
      matchesQuery(a, search));
    if (sort === "old") return [...list].reverse();
    if (sort === "short") return [...list].sort((a, b) => minutesOf(a) - minutesOf(b));
    return list;
  }, [articles, category, tag, search, sort]);

  // Mise en avant : seulement sans filtre et en tri « récents ».
  const showHero = !filtering && sort === "recent" && filtered.length >= 4;
  // Une choisie par l'admin en premier, complétée par les plus récents.
  const top = useMemo(() => (showHero ? withFeaturedFirst(filtered) : filtered), [showHero, filtered]);
  const hero = showHero ? top[0] : null;
  const side = showHero ? top.slice(1, 4) : [];
  // Sections par thème : les tags qui reviennent (au moins 2 articles) ont leur rangée sur la page.
  const sections = useMemo(() => {
    if (!showHero) return [];
    const pool = top.slice(4);
    const used = new Set([hero?.id, ...top.slice(1, 4).map((a) => a.id)].filter(Boolean));
    const counts = tagCounts(pool);
    // Thèmes suivis d'abord (même avec un seul article), puis les thèmes qui reviennent.
    const followedLabels = counts.map(([t]) => t).filter((t) => followed.includes(tagKey(t)));
    const autoLabels = counts
      .filter(([t, n]) => n >= 2 && !followed.includes(tagKey(t)) && !OPINION_TAGS.includes(String(t).toLowerCase()))
      .slice(0, SECTIONS_MAX)
      .map(([t]) => t);
    return [...followedLabels, ...autoLabels]
      .map((tag) => {
        const items = pool
          .filter((a) => !used.has(a.id) && (a.tags || []).some((t) => sameTag(t, tag)))
          .slice(0, SECTION_SIZE);
        items.forEach((a) => used.add(a.id));
        return { tag, items };
      })
      .filter((s) => s.items.length >= (followed.includes(tagKey(s.tag)) ? 1 : 2));
  }, [showHero, top, hero, followed]);

  // Colonnes « Vos thèmes » : les thèmes suivis, ou à défaut les trois plus fréquents.
  const followedLabels = tags.map(([t]) => t).filter((t) => followed.includes(tagKey(t)));
  const colLabels = (followedLabels.length ? followedLabels : tags.slice(0, 3).map(([t]) => t)).slice(0, 4);
  const topicColumns = colLabels.map((label) => ({
    label,
    on: followed.includes(tagKey(label)),
    items: articles.filter((a) => (a.tags || []).some((t) => sameTag(t, label))).slice(0, 4),
  })).filter((c) => c.items.length > 0);

  const sectionIds = new Set(sections.flatMap((s) => s.items.map((a) => a.id)));
  const rest = showHero ? top.slice(4).filter((a) => !sectionIds.has(a.id)) : filtered;
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
      {seo}

      <header style={S.header}>
        <h1 className="bl-title" style={S.title}>{category || "Analyses et actualités"}</h1>
        <p style={S.subtitle}>
          {category
            ? `Tous les articles de la rubrique ${category}.`
            : "Décryptages, enquêtes et points de vue sur l'actualité et les prédictions."}
        </p>
        <div style={S.headerMeta}>
          {articles.length > 0 && <span>{articles.length} article{articles.length > 1 ? "s" : ""}</span>}
          <a href="/rss.xml" style={S.rss}>Flux RSS</a>
        </div>
      </header>

      {articles.length > 0 && (
        <nav aria-label="Rubriques du blog" className="bl-cats" style={S.cats}>
          <Link to="/blog" style={S.catPill(!category)}>Toutes</Link>
          {catCounts
            .filter(([c, n]) => n > 0 || c === category)
            .map(([c, n]) => (
              <Link key={c} to={`/blog/categorie/${categorySlug(c)}`} style={S.catPill(category === c)}>
                {c}<span style={S.pillCount}>{n}</span>
              </Link>
            ))}
        </nav>
      )}

      {unknownCategory && (
        <p style={S.empty}>
          Cette rubrique n'existe pas. <Link to="/blog" style={S.reset}>Voir tous les articles</Link>
        </p>
      )}

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

      {!loading && loadError && (
        <p style={S.empty}>
          Impossible de charger les articles pour le moment.{" "}
          <button type="button" onClick={() => window.location.reload()} style={{ background: "none", border: "none", color: "var(--k-accent)", cursor: "pointer", font: "inherit", textDecoration: "underline", padding: 0 }}>
            Réessayer
          </button>
        </p>
      )}
      {!loading && !loadError && articles.length === 0 && <p style={S.empty}>Aucun article publié pour le moment.</p>}

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

      {!filtering && topicColumns.length > 0 && (
        <section className="bl-topics" aria-label="Vos thèmes">
          <div className="bl-topics-panel">
            <div style={S.asideTitle}>Suivre des thèmes</div>
            <p style={S.asideHint}>Choisissez vos thèmes : ils s'affichent à côté.</p>
            <div style={S.chipWrap}>
              {(followAll ? tags : tags.slice(0, FOLLOW_SHOWN)).map(([t]) => {
                const on = followed.includes(tagKey(t));
                return (
                  <button key={tagKey(t)} type="button" aria-pressed={on} onClick={() => toggleFollow(t)} style={S.chip(on)}>
                    <span aria-hidden="true">{on ? "✓" : "+"}</span> {t}
                  </button>
                );
              })}
            </div>
            {tags.length > FOLLOW_SHOWN && (
              <button type="button" onClick={() => setFollowAll((v) => !v)} style={S.followMore}>
                {followAll ? "Voir moins" : `Voir tous les thèmes (${tags.length})`}
              </button>
            )}
          </div>
          <div className="bl-topics-cols">
            {topicColumns.map(({ label, items, on }) => (
              <div key={tagKey(label)} className="bl-topic-col">
                <div style={S.topicColHead}>
                  <span style={S.topicColTitle}>{label}</span>
                  <button type="button" aria-pressed={on} onClick={() => toggleFollow(label)} style={S.followPill(on)}>
                    {on ? "Suivi ✓" : "+ Suivre"}
                  </button>
                </div>
                <ul style={S.latestList}>
                  {items.map((a) => (
                    <li key={a.id}>
                      <Link to={`/blog/${a.slug}`} style={S.topicItemLink}>
                        <div style={S.topicThumb(a.coverImageUrl)} />
                        <div style={{ minWidth: 0 }}>
                          <div style={S.topicItemTitle}>{a.title}</div>
                          <div style={S.metaSmall}>{dateLabel(a.publishedAt)}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link to={`/blog?tag=${encodeURIComponent(label)}`} style={{ ...S.sectionMore, marginTop: "auto", paddingTop: "12px" }}>Voir tout →</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {sections.map((s) => (
        <section key={s.tag} style={{ marginBottom: "32px" }}>
          <div style={S.sectionHead}>
            <h2 style={S.sectionTitle}>{s.tag}</h2>
            <Link to={`/blog?tag=${encodeURIComponent(s.tag)}`} style={S.sectionMore}>Voir tout →</Link>
          </div>
          <div className="bl-grid">
            {s.items.map((a) => <BlogCard key={a.id} a={a} />)}
          </div>
        </section>
      ))}

      {groups.map((g) => (
        <section key={g.label || "all"} style={{ marginBottom: "28px" }}>
          {g.label && <h2 style={S.month}>{g.label}</h2>}
          <div className="bl-grid">
            {g.items.map((a) => <BlogCard key={a.id} a={a} />)}
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
  .bl-topics { display: flex; gap: 16px; align-items: stretch; margin-bottom: 32px; }
  .bl-topics-panel { width: 260px; flex-shrink: 0; background: var(--k-inset); border: 1px solid rgba(var(--k-accent-rgb),0.25); border-radius: 14px; padding: 18px; }
  .bl-topics-cols { display: flex; gap: 16px; flex: 1; min-width: 0; overflow-x: auto; padding-bottom: 12px; }
  .bl-topics-cols, .bl-pills, .bl-aside { scrollbar-width: thin; scrollbar-color: rgba(var(--k-accent-rgb),0.55) transparent; }
  .bl-topics-cols::-webkit-scrollbar, .bl-pills::-webkit-scrollbar, .bl-aside::-webkit-scrollbar { height: 6px; width: 6px; }
  .bl-topics-cols::-webkit-scrollbar-track, .bl-pills::-webkit-scrollbar-track, .bl-aside::-webkit-scrollbar-track { background: transparent; }
  .bl-topics-cols::-webkit-scrollbar-thumb, .bl-pills::-webkit-scrollbar-thumb, .bl-aside::-webkit-scrollbar-thumb { background: rgba(var(--k-accent-rgb),0.45); border-radius: 999px; }
  .bl-topics-cols::-webkit-scrollbar-thumb:hover { background: var(--k-accent); }
  .bl-topic-col { width: 250px; flex-shrink: 0; display: flex; flex-direction: column; background: var(--k-surface); border: 1px solid var(--k-border); border-radius: 14px; padding: 16px; }
  .bl-layout { display: flex; gap: 32px; align-items: flex-start; }
  .bl-main { flex: 1; min-width: 0; }
  .bl-aside { width: 260px; flex-shrink: 0; position: sticky; top: 90px; max-height: calc(100vh - 110px); overflow-y: auto; background: var(--k-inset); border: 1px solid rgba(var(--k-accent-rgb),0.25); border-radius: 14px; padding: 18px; }
  @media (max-width: 900px) {
    .bl-topics { flex-direction: column; }
    .bl-topics-panel { width: 100%; }
    .bl-layout { flex-direction: column; gap: 20px; }
    .bl-aside { width: 100%; position: static; max-height: 280px; }
  }
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
  cats: { display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "28px" },
  catPill: (active) => ({
    fontSize: "0.9rem", fontWeight: 600, padding: "8px 16px", borderRadius: "999px", textDecoration: "none",
    border: active ? "1px solid var(--k-accent)" : "1px solid var(--k-border)",
    background: active ? "var(--k-accent)" : "var(--k-surface)",
    color: active ? "#fff" : "var(--k-text2)",
  }),
  catLabel: {
    fontSize: "0.72rem", fontWeight: 700, color: "var(--k-accent-text)", textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
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
  asideTitle: { fontSize: "1rem", fontWeight: 700, color: "var(--k-accent-text)", marginBottom: "6px" },
  asideHint: { fontSize: "0.8rem", color: "var(--k-muted)", margin: "0 0 16px", lineHeight: 1.4 },
  asideBlock: { marginTop: "18px", paddingTop: "16px", borderTop: "1px solid var(--k-surface2)" },
  latestList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" },
  latestLink: { display: "block", fontSize: "0.88rem", fontWeight: 600, lineHeight: 1.35, color: "var(--k-text)", textDecoration: "none", marginBottom: "3px" },
  topicColHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "12px" },
  topicColTitle: { fontSize: "1rem", fontWeight: 700, color: "var(--k-text)", textTransform: "capitalize", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  followPill: (on) => ({
    fontSize: "0.75rem", fontWeight: 600, padding: "4px 10px", borderRadius: "999px", cursor: "pointer", whiteSpace: "nowrap",
    border: on ? "1px solid var(--k-accent)" : "1px solid var(--k-border2)",
    background: on ? "var(--k-accent)" : "transparent",
    color: on ? "#fff" : "var(--k-text2)",
  }),
  topicItemLink: { display: "flex", gap: "10px", alignItems: "flex-start", textDecoration: "none", color: "inherit", marginBottom: "12px" },
  topicThumb: (url) => ({
    width: "56px", height: "44px", borderRadius: "8px", flexShrink: 0,
    background: url ? `linear-gradient(to top, rgba(0,0,0,0.25), rgba(0,0,0,0.25)), ${cssUrl(url)} center / cover no-repeat` : "linear-gradient(135deg,var(--k-accent-deep),var(--k-inset))",
  }),
  topicItemTitle: { fontSize: "0.88rem", fontWeight: 600, lineHeight: 1.35, color: "var(--k-text)", marginBottom: "3px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  chipWrap: { display: "flex", flexWrap: "wrap", gap: "8px" },
  followMore: { marginTop: "12px", background: "none", border: "none", padding: 0, color: "var(--k-accent-text)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" },
  chip: (on) => ({
    fontSize: "0.85rem", fontWeight: 500, padding: "6px 12px", borderRadius: "999px", cursor: "pointer",
    whiteSpace: "nowrap", textTransform: "capitalize",
    border: on ? "1px solid var(--k-accent)" : "1px solid var(--k-border2)",
    background: on ? "rgba(var(--k-accent-rgb),0.25)" : "transparent",
    color: on ? "var(--k-accent-text)" : "var(--k-text2)",
  }),
  sectionHead: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginBottom: "14px", paddingBottom: "8px", borderBottom: "1px solid var(--k-surface2)" },
  sectionTitle: { fontSize: "1.1rem", fontWeight: 700, color: "var(--k-text)", margin: 0, textTransform: "capitalize" },
  sectionMore: { fontSize: "0.85rem", fontWeight: 600, color: "var(--k-accent-text)", textDecoration: "none", whiteSpace: "nowrap" },
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
