import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useSEO } from "../hooks/useSEO";
import { normalize } from "../lib/blogUtils";
import { cssUrl } from "../lib/cssUrl";

const CATEGORIES = ["Sport", "Politique", "Crypto", "Tech", "Économie", "International", "Culture", "Climat", "Autre"];
const PAGE = 18;
const FOLLOW_KEY = "kassandre_markets_follow";
const FOLLOW_SHOWN = 10;

// Les tags saisis à la main varient (« france », « France », « États-Unis »).
const tagKey = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]+/g, "-").trim();
const prettyTag = (t) => { const x = String(t || "").trim(); return x.charAt(0).toUpperCase() + x.slice(1); };
function readFollowed() {
  try {
    const v = JSON.parse(localStorage.getItem(FOLLOW_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}

const catsOf = (m) => (Array.isArray(m.categories) ? m.categories : m.category ? [m.category] : []);
const pctOf = (m) => {
  if (m.type === "multi") return null;
  const total = (m.poolYes || 0) + (m.poolNo || 0);
  return total > 0 ? Math.round((m.poolNo / total) * 100) : null;
};
const fmtVol = (m) => {
  const v = Math.round(m.totalVolume || 0);
  return v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(".0", "")} M pts` : v >= 1e3 ? `${(v / 1e3).toFixed(1).replace(".0", "")} k pts` : `${v} pts`;
};
function daysLeft(m) {
  if (!m.resolutionDate) return null;
  const d = new Date(`${m.resolutionDate}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
function whenLabel(m, resolved) {
  if (resolved) return `Résolu le ${m.resolutionDate || ""}`.trim();
  const n = daysLeft(m);
  if (n === null) return "";
  if (n <= 0) return "Résolution imminente";
  if (n === 1) return "Se termine demain";
  if (n <= 30) return `Se termine dans ${n} jours`;
  return `Résolution : ${m.resolutionDate}`;
}

function Prob({ m, big }) {
  const pct = pctOf(m);
  if (pct === null) return <span style={{ ...S.multi, fontSize: big ? "1rem" : "0.85rem" }}>Multi-choix</span>;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
        <span style={{ fontSize: big ? "2.6rem" : "1.5rem", fontWeight: 800, color: "var(--k-accent-text)", lineHeight: 1 }}>{pct} %</span>
        <span style={{ fontSize: big ? "0.95rem" : "0.8rem", color: "var(--k-muted2)" }}>de chance que OUI</span>
      </div>
      <div style={S.track}><div style={{ ...S.fill, width: `${pct}%` }} /></div>
    </div>
  );
}

// Jauge OUI / NON des cartes : deux segments, vert et rouge.
function CardGauge({ m }) {
  const pct = pctOf(m);
  if (pct === null) {
    return (
      <div style={S.multiBox}>
        <span style={S.multiDot} />
        <span style={S.multiText}>Marché à choix multiples</span>
        <span style={S.multiArrow}>→</span>
      </div>
    );
  }
  return (
    <div>
      <div style={S.gaugeLabels}>
        <span style={{ color: "#22c55e" }}>OUI <strong style={S.gaugePct}>{pct} %</strong></span>
        <span style={{ color: "#ef4444" }}><strong style={S.gaugePct}>{100 - pct} %</strong> NON</span>
      </div>
      <div style={S.gaugeTrack}>
        <div style={{ ...S.gaugeYes, width: `${pct}%` }} />
        <div style={{ ...S.gaugeNo, width: `${100 - pct}%` }} />
      </div>
    </div>
  );
}

function MarketCard({ m, resolved }) {
  const n = daysLeft(m);
  const urgent = !resolved && n !== null && n >= 0 && n <= 3;
  const hot = (m.totalVolume || 0) >= 50000;
  return (
    <Link to={`/market/${m.id}`} className="mk-card">
      <div className="mk-cover" style={{ background: m.coverImageUrl ? undefined : "linear-gradient(135deg,var(--k-accent-deep),var(--k-inset))" }}>
        {m.coverImageUrl && <img src={m.coverImageUrl} alt="" loading="lazy" decoding="async" />}
        <div className="mk-cover-fade" />
        <span style={S.coverCat}>{catsOf(m)[0] || "Marché"}</span>
        <div style={S.coverBadges}>
          {m.pinnedFeatured && <span style={S.coverStar}>★ À la une</span>}
          {hot && !m.pinnedFeatured && <span style={S.coverHot}>🔥 Populaire</span>}
        </div>
        <span style={{ ...S.timePill, ...(urgent ? S.timeUrgent : null) }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          {whenLabel(m, resolved) || "—"}
        </span>
      </div>
      <div style={S.cardBody}>
        <h3 style={S.cardTitle}>{m.question}</h3>
        <CardGauge m={m} />
        <div style={S.cardFoot}>
          <span style={S.volChip}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
            {fmtVol(m)}
          </span>
          <span className="mk-cta" style={{ ...S.cta, display: "inline-block", transition: "transform .2s" }}>Parier →</span>
        </div>
      </div>
    </Link>
  );
}

// Page « Marchés » : tous les marchés, présentés comme le blog (une, cartes, filtres).
export default function Marches() {
  const [params, setParams] = useSearchParams();
  const [markets, setMarkets] = useState([]);
  const [loadedStatus, setLoadedStatus] = useState(null);
  const [visible, setVisible] = useState(PAGE);
  const [followed, setFollowed] = useState(() => readFollowed());
  const [followAll, setFollowAll] = useState(false);
  const toggleFollow = (label) => {
    const k = tagKey(label);
    setFollowed((prev) => {
      const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
      try { localStorage.setItem(FOLLOW_KEY, JSON.stringify(next)); } catch { /* navigation privée */ }
      return next;
    });
  };

  const status = params.get("statut") || "open";
  const loading = loadedStatus !== status;
  const q = params.get("q") || "";
  const cat = params.get("cat") || "";
  const type = params.get("type") || "";
  const tag = params.get("tag") || "";
  const sort = params.get("tri") || "volume";
  const resolved = status === "resolved";

  useEffect(() => {
    let alive = true;
    getDocs(query(collection(db, "markets"), where("status", "==", status), orderBy("createdAt", "desc"), limit(400)))
      .then((snap) => { if (alive) setMarkets(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); })
      .catch(() => { if (alive) setMarkets([]); })
      .finally(() => { if (alive) setLoadedStatus(status); });
    return () => { alive = false; };
  }, [status]);

  function setParam(name, value) {
    setVisible(PAGE);
    const next = new URLSearchParams(params);
    const defaults = { statut: "open", tri: "volume" };
    if (!value || value === defaults[name]) next.delete(name); else next.set(name, value);
    setParams(next, { replace: true });
  }

  const counts = useMemo(() => {
    const map = new Map(CATEGORIES.map((c) => [c, 0]));
    markets.forEach((m) => catsOf(m).forEach((c) => map.has(c) && map.set(c, map.get(c) + 1)));
    return map;
  }, [markets]);

  const totalVolume = useMemo(() => markets.reduce((a, m) => a + (m.totalVolume || 0), 0), [markets]);

  // Thèmes (tags) des marchés, regroupés sans casse ni accents.
  const tags = useMemo(() => {
    const map = new Map();
    markets.forEach((m) => {
      const seen = new Set();
      (m.tags || []).forEach((t) => {
        const k = tagKey(t);
        if (!k || seen.has(k)) return;
        seen.add(k);
        if (!map.has(k)) map.set(k, { label: prettyTag(t), n: 0 });
        map.get(k).n += 1;
      });
    });
    return [...map.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "fr"));
  }, [markets]);

  const topicColumns = useMemo(() => {
    const chosen = tags.filter((t) => followed.includes(t.key));
    const base = (chosen.length ? chosen : tags.slice(0, 3)).slice(0, 4);
    return base.map((t) => ({
      ...t,
      on: followed.includes(t.key),
      items: [...markets]
        .filter((m) => (m.tags || []).some((x) => tagKey(x) === t.key))
        .sort((a, b) => (b.totalVolume || 0) - (a.totalVolume || 0))
        .slice(0, 4),
    })).filter((c) => c.items.length > 0);
  }, [tags, followed, markets]);

  const list = useMemo(() => {
    const needle = normalize(q).trim();
    const out = markets.filter((m) => {
      if (cat && !catsOf(m).includes(cat)) return false;
      if (type && (m.type === "multi" ? "multi" : "binary") !== type) return false;
      if (tag && !(m.tags || []).some((x) => tagKey(x) === tag)) return false;
      if (!needle) return true;
      return needle.split(/\s+/).every((w) => normalize([m.question, ...(m.tags || [])].join(" ")).includes(w));
    });
    if (sort === "closing") out.sort((a, b) => String(a.resolutionDate || "9").localeCompare(String(b.resolutionDate || "9")));
    else if (sort === "volume") out.sort((a, b) => (b.totalVolume || 0) - (a.totalVolume || 0));
    return out;
  }, [markets, q, cat, type, tag, sort]);

  const filtering = Boolean(q || cat || type || tag);
  const showHero = !loading && !resolved && !filtering && sort === "volume" && list.length >= 5;
  const pinned = list.filter((m) => m.pinnedFeatured);
  const hero = showHero ? (pinned[0] || list[0]) : null;
  const soon = useMemo(() => {
    if (!showHero) return [];
    return markets
      .filter((m) => m.id !== hero?.id && (daysLeft(m) ?? 999) >= 0)
      .sort((a, b) => String(a.resolutionDate || "9").localeCompare(String(b.resolutionDate || "9")))
      .slice(0, 4);
  }, [markets, showHero, hero]);
  const rest = showHero ? list.filter((m) => m.id !== hero.id) : list;

  const seo = useSEO({
    title: "Marchés de prédiction",
    description: "Tous les marchés de prédiction de Kassandre : politique, économie, tech, sport. Parie en points virtuels.",
    url: "/marches",
  });

  return (
    <div style={S.page}>
      {seo}
      <style>{CSS}</style>

      <header style={S.header}>
        <h1 className="mk-title" style={S.title}>{resolved ? "Marchés résolus" : "Les marchés"}</h1>
        <p style={S.subtitle}>
          {resolved ? "Ce qui s'est réellement passé, et qui avait vu juste." : "Prédis l'actualité, mesure-toi aux autres, sans risquer d'argent."}
        </p>
        {!loading && (
          <div style={S.headerMeta}>
            <span>{markets.length} marché{markets.length > 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{fmtVol({ totalVolume })} échangés</span>
          </div>
        )}
      </header>

      <div style={S.toolbar}>
        <input type="search" value={q} onChange={(e) => setParam("q", e.target.value)} placeholder="Rechercher un marché, un thème..." aria-label="Rechercher un marché" style={S.search} />
        <select value={sort} onChange={(e) => setParam("tri", e.target.value)} aria-label="Trier" style={S.select}>
          <option value="volume">Plus actifs</option>
          <option value="recent">Plus récents</option>
          <option value="closing">Se terminent bientôt</option>
        </select>
        <select value={type} onChange={(e) => setParam("type", e.target.value)} aria-label="Type" style={S.select}>
          <option value="">Tous types</option>
          <option value="binary">Oui / Non</option>
          <option value="multi">Multi-choix</option>
        </select>
      </div>

      <nav className="mk-pills" style={S.pills} aria-label="Catégories">
        <button style={S.pill(!cat && !resolved)} onClick={() => { setParam("statut", ""); setParam("cat", ""); }}>Tous</button>
        {CATEGORIES.filter((c) => counts.get(c) > 0 || cat === c).map((c) => (
          <button key={c} style={S.pill(cat === c)} onClick={() => setParam("cat", cat === c ? "" : c)}>
            {c}<span style={S.count}>{counts.get(c)}</span>
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button style={S.pill(resolved)} onClick={() => setParam("statut", resolved ? "" : "resolved")}>
          {resolved ? "← Marchés ouverts" : "Résolus"}
        </button>
      </nav>

      {tag && (
        <p style={S.activeTag}>
          Thème : <strong>{tags.find((t) => t.key === tag)?.label || tag}</strong>
          <button style={S.reset} onClick={() => setParam("tag", "")}>Effacer</button>
        </p>
      )}

      {loading && <div className="mk-grid">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="mk-skel" />)}</div>}
      {!loading && list.length === 0 && <p style={S.empty}>Aucun marché ne correspond à votre recherche.</p>}

      {hero && (
        <section className="mk-hero" aria-label="À la une">
          <Link to={`/market/${hero.id}`} className="mk-hero-main" style={{
            background: hero.coverImageUrl
              ? `linear-gradient(to top, rgba(var(--k-bg-rgb),0.97) 14%, rgba(var(--k-bg-rgb),0.45) 75%), ${cssUrl(hero.coverImageUrl)} center / cover no-repeat`
              : "linear-gradient(135deg, var(--k-accent-deep), var(--k-bg))",
          }}>
            <div style={S.heroBody}>
              <div style={S.heroBadges}>
                <span style={S.badge}>{hero.pinnedFeatured ? "À la une" : "Le plus actif"}</span>
                {catsOf(hero)[0] && <span style={S.badgeCat}>{catsOf(hero)[0]}</span>}
              </div>
              <h2 className="mk-hero-title" style={S.heroTitle}>{hero.question}</h2>
              <Prob m={hero} big />
              <div style={S.heroFoot}>{fmtVol(hero)} · {whenLabel(hero, false)}</div>
            </div>
          </Link>
          <div className="mk-side">
            <div style={S.sideTitle}>Se terminent bientôt</div>
            {soon.map((m) => (
              <Link key={m.id} to={`/market/${m.id}`} className="mk-side-item">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={S.sideQ}>{m.question}</div>
                  <div style={S.sideMeta}>{whenLabel(m, false)}</div>
                </div>
                <div style={S.sidePct}>{pctOf(m) !== null ? `${pctOf(m)} %` : "Multi"}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && !resolved && !filtering && topicColumns.length > 0 && (
        <section className="mk-topics" aria-label="Vos thèmes">
          <div className="mk-topics-panel">
            <div style={S.panelTitle}>Suivre des thèmes</div>
            <p style={S.panelHint}>Choisissez vos thèmes : leurs marchés s'affichent à côté.</p>
            <div style={S.chipWrap}>
              {(followAll ? tags : tags.slice(0, FOLLOW_SHOWN)).map((t) => {
                const on = followed.includes(t.key);
                return (
                  <button key={t.key} type="button" aria-pressed={on} onClick={() => toggleFollow(t.label)} style={S.chip(on)}>
                    <span aria-hidden="true">{on ? "✓" : "+"}</span> {t.label}
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
          <div className="mk-topics-cols">
            {topicColumns.map((c) => (
              <div key={c.key} className="mk-topic-col">
                <div style={S.topicHead}>
                  <span style={S.topicTitle}>{c.label}</span>
                  <button type="button" aria-pressed={c.on} onClick={() => toggleFollow(c.label)} style={S.followPill(c.on)}>
                    {c.on ? "Suivi ✓" : "+ Suivre"}
                  </button>
                </div>
                {c.items.map((m) => (
                  <Link key={m.id} to={`/market/${m.id}`} className="mk-side-item">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={S.sideQ}>{m.question}</div>
                      <div style={S.sideMeta}>{whenLabel(m, false)}</div>
                    </div>
                    <div style={S.sidePct}>{pctOf(m) !== null ? `${pctOf(m)} %` : "Multi"}</div>
                  </Link>
                ))}
                <Link to={`/marches?tag=${encodeURIComponent(c.key)}`} style={S.topicMore}>Voir tout ({c.n}) →</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && rest.length > 0 && (
        <>
          {showHero && <h2 style={S.sectionTitle}>Tous les marchés</h2>}
          <div className="mk-grid">
            {rest.slice(0, visible).map((m) => <MarketCard key={m.id} m={m} resolved={resolved} />)}
          </div>
        </>
      )}

      {rest.length > visible && (
        <button style={S.more} onClick={() => setVisible((v) => v + PAGE)}>Voir plus de marchés ({rest.length - visible})</button>
      )}
    </div>
  );
}

const CSS = `
  .mk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .mk-card { display: flex; flex-direction: column; background: var(--k-surface); border: 1px solid var(--k-border); border-radius: 16px; overflow: hidden; text-decoration: none; transition: border-color .2s, transform .2s, box-shadow .2s; }
  .mk-card:hover { border-color: var(--k-accent); transform: translateY(-3px); box-shadow: 0 12px 30px rgba(var(--k-accent-rgb),0.18); }
  .mk-cover { position: relative; aspect-ratio: 16 / 9; overflow: hidden; }
  .mk-cover img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .4s; }
  .mk-card:hover .mk-cover img { transform: scale(1.05); }
  .mk-cover-fade { position: absolute; inset: 0; background: linear-gradient(to top, rgba(var(--k-bg-rgb),0.85) 0%, rgba(var(--k-bg-rgb),0) 55%); pointer-events: none; }
  .mk-card:hover .mk-cta { transform: translateX(3px); }
  .mk-skel { height: 300px; border-radius: 14px; background: linear-gradient(90deg,var(--k-surface),var(--k-surface2),var(--k-surface)); background-size: 200% 100%; animation: mkskel 1.4s infinite; }
  @keyframes mkskel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  .mk-hero { display: grid; grid-template-columns: 1.7fr 1fr; gap: 18px; margin-bottom: 40px; }
  .mk-hero-main { display: flex; align-items: flex-end; min-height: 380px; border-radius: 16px; overflow: hidden; text-decoration: none; border: 1px solid var(--k-border); transition: border-color .2s; }
  .mk-hero-main:hover { border-color: var(--k-accent); }
  .mk-side { display: flex; flex-direction: column; gap: 4px; background: var(--k-surface); border: 1px solid var(--k-border); border-radius: 16px; padding: 18px; }
  .mk-side-item { display: flex; gap: 12px; padding: 12px 0; border-top: 1px solid var(--k-surface2); text-decoration: none; align-items: center; }
  .mk-side-item:first-of-type { border-top: none; }
  .mk-side-item:hover div:first-child > div:first-child { color: var(--k-accent-text); }
  .mk-topics { display: flex; gap: 16px; align-items: stretch; margin: 0 0 40px; }
  .mk-topics-panel { width: 270px; flex-shrink: 0; background: var(--k-inset); border: 1px solid rgba(var(--k-accent-rgb),0.25); border-radius: 16px; padding: 20px; }
  .mk-topics-cols { display: flex; gap: 16px; flex: 1; min-width: 0; overflow-x: auto; padding-bottom: 10px; scrollbar-width: thin; scrollbar-color: rgba(var(--k-accent-rgb),0.55) transparent; }
  .mk-topics-cols::-webkit-scrollbar { height: 6px; }
  .mk-topics-cols::-webkit-scrollbar-thumb { background: rgba(var(--k-accent-rgb),0.45); border-radius: 999px; }
  .mk-topic-col { width: 270px; flex-shrink: 0; display: flex; flex-direction: column; background: var(--k-surface); border: 1px solid var(--k-border); border-radius: 16px; padding: 16px 18px; }
  .mk-pills { scrollbar-width: thin; scrollbar-color: rgba(var(--k-accent-rgb),0.55) transparent; }
  .mk-pills::-webkit-scrollbar { height: 6px; }
  .mk-pills::-webkit-scrollbar-thumb { background: rgba(var(--k-accent-rgb),0.45); border-radius: 999px; }
  @media (max-width: 900px) {
    .mk-grid { grid-template-columns: repeat(2, 1fr); }
    .mk-hero { grid-template-columns: 1fr; }
    .mk-topics { flex-direction: column; }
    .mk-topics-panel { width: 100%; box-sizing: border-box; }
    .mk-hero-main { min-height: 320px; }
  }
  @media (max-width: 600px) {
    .mk-grid { grid-template-columns: 1fr; }
    .mk-title { font-size: 1.9rem !important; }
    .mk-hero-title { font-size: 1.4rem !important; }
    .mk-pills { flex-wrap: nowrap !important; overflow-x: auto; padding-bottom: 6px; }
    .mk-pills button { flex-shrink: 0; white-space: nowrap; }
  }
`;

const S = {
  page: { maxWidth: "1100px", margin: "0 auto", padding: "40px 20px", minHeight: "calc(100vh - 200px)" },
  header: { textAlign: "center", marginBottom: "28px" },
  title: { fontSize: "2.5rem", fontWeight: "bold", color: "var(--k-text)", margin: "0 0 10px" },
  subtitle: { fontSize: "1.05rem", color: "var(--k-muted2)", margin: 0 },
  headerMeta: { display: "flex", justifyContent: "center", gap: "10px", marginTop: "12px", fontSize: "0.85rem", color: "var(--k-muted)" },
  toolbar: { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" },
  search: { flex: "1 1 260px", minWidth: 0, boxSizing: "border-box", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--k-border)", background: "var(--k-surface)", color: "var(--k-text)", fontSize: "15px" },
  select: { padding: "0 12px", height: "46px", borderRadius: "10px", border: "1px solid var(--k-border)", background: "var(--k-surface)", color: "var(--k-text)", fontSize: "14px" },
  pills: { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "30px" },
  pill: (on) => ({ fontSize: "0.88rem", padding: "7px 15px", borderRadius: "999px", cursor: "pointer", border: on ? "1px solid var(--k-accent)" : "1px solid var(--k-border)", background: on ? "var(--k-accent)" : "transparent", color: on ? "#fff" : "var(--k-text2)", fontWeight: on ? 600 : 500 }),
  count: { opacity: 0.65, marginLeft: "7px", fontSize: "0.8rem" },
  empty: { color: "var(--k-muted2)", textAlign: "center", padding: "40px 0" },
  sectionTitle: { fontSize: "1.1rem", fontWeight: 700, color: "var(--k-text)", margin: "0 0 16px", paddingBottom: "8px", borderBottom: "1px solid var(--k-surface2)" },
  heroBody: { padding: "28px", width: "100%", boxSizing: "border-box" },
  heroBadges: { display: "flex", gap: "8px", marginBottom: "12px" },
  badge: { fontSize: "0.72rem", fontWeight: 700, color: "#fff", background: "var(--k-accent)", borderRadius: "6px", padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.06em" },
  badgeCat: { fontSize: "0.72rem", fontWeight: 700, color: "var(--k-accent-text)", background: "rgba(var(--k-accent-rgb),0.2)", borderRadius: "6px", padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.06em" },
  heroTitle: { fontSize: "1.8rem", fontWeight: "bold", color: "#fff", margin: "0 0 16px", lineHeight: 1.25 },
  heroFoot: { fontSize: "0.85rem", color: "var(--k-muted2)", marginTop: "12px" },
  sideTitle: { fontSize: "0.8rem", fontWeight: 700, color: "var(--k-accent-text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" },
  sideQ: { fontSize: "0.92rem", fontWeight: 600, color: "var(--k-text)", lineHeight: 1.35, marginBottom: "4px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
  sideMeta: { fontSize: "0.78rem", color: "var(--k-muted)" },
  sidePct: { fontSize: "1.1rem", fontWeight: 800, color: "var(--k-accent-text)", flexShrink: 0 },
  track: { height: "6px", borderRadius: "999px", background: "rgba(var(--k-accent-rgb),0.18)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, var(--k-accent), var(--k-accent-text))" },
  panelTitle: { fontSize: "1rem", fontWeight: 700, color: "var(--k-accent-text)", marginBottom: "6px" },
  panelHint: { fontSize: "0.8rem", color: "var(--k-muted)", margin: "0 0 16px", lineHeight: 1.4 },
  chipWrap: { display: "flex", flexWrap: "wrap", gap: "8px" },
  chip: (on) => ({ fontSize: "0.85rem", fontWeight: 500, padding: "6px 12px", borderRadius: "999px", cursor: "pointer", whiteSpace: "nowrap", border: on ? "1px solid var(--k-accent)" : "1px solid var(--k-border2)", background: on ? "rgba(var(--k-accent-rgb),0.25)" : "transparent", color: on ? "var(--k-accent-text)" : "var(--k-text2)" }),
  followMore: { marginTop: "12px", background: "none", border: "none", padding: 0, color: "var(--k-accent-text)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" },
  topicHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "6px" },
  topicTitle: { fontSize: "1rem", fontWeight: 700, color: "var(--k-text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  followPill: (on) => ({ fontSize: "0.75rem", fontWeight: 600, padding: "4px 10px", borderRadius: "999px", cursor: "pointer", whiteSpace: "nowrap", border: on ? "1px solid var(--k-accent)" : "1px solid var(--k-border2)", background: on ? "var(--k-accent)" : "transparent", color: on ? "#fff" : "var(--k-text2)" }),
  topicMore: { marginTop: "auto", paddingTop: "12px", fontSize: "0.85rem", fontWeight: 600, color: "var(--k-accent-text)", textDecoration: "none" },
  activeTag: { fontSize: "0.9rem", color: "var(--k-muted2)", margin: "0 0 18px" },
  reset: { marginLeft: "12px", background: "none", border: "none", color: "var(--k-accent-text)", cursor: "pointer", fontSize: "0.9rem", textDecoration: "underline" },
  coverCat: { position: "absolute", top: "12px", left: "12px", fontSize: "0.7rem", fontWeight: 700, color: "#fff", background: "rgba(var(--k-accent-rgb),0.85)", backdropFilter: "blur(4px)", borderRadius: "999px", padding: "4px 11px", textTransform: "uppercase", letterSpacing: "0.06em" },
  coverBadges: { position: "absolute", top: "12px", right: "12px", display: "flex", gap: "6px" },
  coverStar: { fontSize: "0.7rem", fontWeight: 700, color: "#f59e0b", background: "rgba(var(--k-bg-rgb),0.88)", borderRadius: "999px", padding: "4px 10px" },
  coverHot: { fontSize: "0.7rem", fontWeight: 700, color: "#fb923c", background: "rgba(var(--k-bg-rgb),0.88)", borderRadius: "999px", padding: "4px 10px" },
  timePill: { position: "absolute", left: "12px", bottom: "12px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", fontWeight: 600, color: "var(--k-text)", background: "rgba(var(--k-bg-rgb),0.82)", backdropFilter: "blur(4px)", borderRadius: "999px", padding: "5px 11px" },
  timeUrgent: { color: "#fbbf24", background: "rgba(120,53,15,0.75)" },
  cardBody: { padding: "16px 18px 16px", display: "flex", flexDirection: "column", gap: "16px", flex: 1 },
  cardTitle: { fontSize: "1.05rem", fontWeight: 700, color: "var(--k-text)", margin: 0, lineHeight: 1.35, minHeight: "4.1em", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
  gaugeLabels: { display: "flex", justifyContent: "space-between", fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "7px" },
  gaugePct: { fontSize: "1.15rem", fontWeight: 800, letterSpacing: 0 },
  gaugeTrack: { display: "flex", height: "8px", borderRadius: "999px", overflow: "hidden", gap: "3px", background: "transparent" },
  gaugeYes: { background: "linear-gradient(90deg,#16a34a,#22c55e)", borderRadius: "999px", minWidth: "4px" },
  gaugeNo: { background: "linear-gradient(90deg,#ef4444,#dc2626)", borderRadius: "999px", minWidth: "4px" },
  multiBox: { display: "flex", alignItems: "center", gap: "10px", padding: "11px 14px", borderRadius: "12px", background: "rgba(var(--k-accent-rgb),0.12)", border: "1px solid rgba(var(--k-accent-rgb),0.3)" },
  multiDot: { width: "8px", height: "8px", borderRadius: "50%", background: "var(--k-accent)", flexShrink: 0 },
  multiText: { flex: 1, fontSize: "0.85rem", fontWeight: 600, color: "var(--k-accent-text)" },
  multiArrow: { color: "var(--k-accent-text)", fontWeight: 700 },
  cardFoot: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--k-surface2)" },
  volChip: { display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--k-muted2)" },
  cta: { fontSize: "0.85rem", fontWeight: 700, color: "var(--k-accent-text)" },
  multi: { fontWeight: 700, color: "var(--k-accent-text)" },
  more: { display: "block", margin: "28px auto 0", padding: "12px 28px", borderRadius: "10px", background: "transparent", border: "1px solid var(--k-accent)", color: "var(--k-accent-text)", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" },
};
