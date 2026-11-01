import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useSEO } from "../hooks/useSEO";
import { normalize } from "../lib/blogUtils";
import { cssUrl } from "../lib/cssUrl";

const CATEGORIES = ["Sport", "Politique", "Crypto", "Tech", "Économie", "International", "Culture", "Climat", "Autre"];
const PAGE = 18;
// Un symbole par catégorie et une nuance de la palette violette du site :
// on garde l'identité Kassandre tout en distinguant les marchés.
const CAT_STYLE = {
  Sport: { c: "#8b5cf6", e: "⚽" },
  Politique: { c: "#7c3aed", e: "🏛️" },
  Crypto: { c: "#a855f7", e: "₿" },
  Tech: { c: "#6366f1", e: "💻" },
  Économie: { c: "#9d6bff", e: "📈" },
  International: { c: "#818cf8", e: "🌍" },
  Culture: { c: "#c084fc", e: "🎬" },
  Climat: { c: "#7c6cf0", e: "🌱" },
  Autre: { c: "#9ca3c7", e: "◆" },
};
const catStyle = (m) => CAT_STYLE[catsOf(m)[0]] || { c: "#a78bfa", e: "◆" };
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

// Carte de marché : même présentation que l'accueil (titre + jauge, tags, Oui / Non,
// volume et résolution). Sans image de couverture, un fond dégradé et un symbole comblent le vide.
function MarketCard({ m, resolved }) {
  const navigate = useNavigate();
  const { c, e } = catStyle(m);
  const isMulti = m.type === "multi";
  const pct = pctOf(m);
  const n = daysLeft(m);
  const urgent = !resolved && n !== null && n >= 0 && n <= 3;
  const hasImg = Boolean(m.coverImageUrl);
  const circ = 2 * Math.PI * 18;
  return (
    <Link to={`/market/${m.id}`} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
      <div
        className="mk-card"
        style={{
          overflow: "hidden", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column",
          cursor: "pointer", borderRadius: "14px", border: "0.5px solid rgba(var(--k-accent-rgb),0.15)", background: "var(--k-surface)",
        }}
      >
        {/* Partie haute : image (ou fond décoratif), titre et jauge */}
        <div
          style={{
            position: "relative", overflow: "hidden", minHeight: "128px", padding: "16px 16px 14px",
            display: "flex", alignItems: "flex-end", gap: "10px",
            background: hasImg
              ? `linear-gradient(to top, rgba(var(--k-bg-rgb),0.92) 8%, rgba(var(--k-bg-rgb),0.35) 85%), ${cssUrl(m.coverImageUrl)} center / cover no-repeat`
              : `radial-gradient(circle at 88% 15%, ${c}66, transparent 58%), radial-gradient(circle at 6% 100%, ${c}33, transparent 50%), linear-gradient(160deg, ${c}26, var(--k-inset))`,
          }}
        >
          {!hasImg && <span style={S.coverEmoji} aria-hidden="true">{e}</span>}
          <p style={{
            position: "relative", fontWeight: 600, fontSize: "14px", color: "#fff", lineHeight: 1.35, flex: 1, margin: 0,
            textShadow: "0 1px 6px rgba(0,0,0,0.45)",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{m.question}</p>
          {!isMulti && pct !== null && (
            <svg width="42" height="42" viewBox="0 0 44 44" style={{ position: "relative", flexShrink: 0 }}>
              <circle cx="22" cy="22" r="19" fill="rgba(var(--k-bg-rgb),0.55)" />
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(var(--k-accent-rgb),0.25)" strokeWidth="4" />
              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--k-accent)" strokeWidth="4" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" transform="rotate(-90 22 22)" />
              <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">{pct}%</text>
            </svg>
          )}
        </div>

        {/* Partie basse : tags, Oui / Non, volume et résolution */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 16px 14px" }}>
          {(m.tags || []).length > 0 && (
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "12px" }}>
              {m.tags.slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); navigate(`/marches?tag=${encodeURIComponent(tagKey(tag))}`); }}
                  style={{ fontSize: "11px", fontWeight: 500, color: "var(--k-accent-text)", background: "rgba(var(--k-accent-rgb),0.12)", border: "0.5px solid rgba(var(--k-accent-rgb),0.25)", borderRadius: "6px", padding: "2px 8px", cursor: "pointer" }}
                >#{tag}</button>
              ))}
            </div>
          )}

          {!isMulti && pct !== null && (
            <div style={{ display: "flex", gap: "6px", marginTop: "auto", marginBottom: "12px" }}>
              <div style={{ flex: 1, padding: "7px", borderRadius: "7px", textAlign: "center", border: "0.5px solid rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.12)", color: "#22c55e", fontWeight: 600, fontSize: "12px" }}>Oui · {pct}%</div>
              <div style={{ flex: 1, padding: "7px", borderRadius: "7px", textAlign: "center", border: "0.5px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)", color: "#ef4444", fontWeight: 600, fontSize: "12px" }}>Non · {100 - pct}%</div>
            </div>
          )}
          {isMulti && <p style={{ fontSize: "11px", color: "var(--k-muted)", marginTop: "auto", marginBottom: "12px" }}>Multi-choix</p>}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "var(--k-muted)", paddingTop: "10px", borderTop: "0.5px solid rgba(var(--k-accent-rgb),0.12)" }}>
            <span>{Math.round(m.totalVolume || 0)} pts Vol.</span>
            <span style={urgent ? { color: "#fbbf24", fontWeight: 600 } : undefined}>
              {resolved ? `Résolu le ${m.resolutionDate || ""}` : urgent ? whenLabel(m, false) : `Résolution : ${m.resolutionDate || "n.c."}`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Ligne compacte : vignette (image ou symbole), question, échéance et jauge circulaire.
function MiniRow({ m }) {
  const { c, e } = catStyle(m);
  const pct = pctOf(m);
  const n = daysLeft(m);
  const urgent = n !== null && n >= 0 && n <= 3;
  const circ = 2 * Math.PI * 15;
  return (
    <Link to={`/market/${m.id}`} className="mk-mini">
      <div style={{
        width: "52px", height: "52px", borderRadius: "12px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px",
        background: m.coverImageUrl
          ? `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), ${cssUrl(m.coverImageUrl)} center / cover no-repeat`
          : `radial-gradient(circle at 80% 15%, ${c}66, transparent 60%), linear-gradient(160deg, ${c}26, var(--k-inset))`,
        border: "0.5px solid rgba(var(--k-accent-rgb),0.2)",
      }}>{!m.coverImageUrl && <span aria-hidden="true">{e}</span>}</div>
      <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
        <div style={S.miniQ}>{m.question}</div>
        <div style={{ ...S.miniMeta, ...(urgent ? { color: "#fbbf24" } : null) }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          {whenLabel(m, false) || "—"}
        </div>
      </div>
      {pct !== null ? (
        <svg width="40" height="40" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(var(--k-accent-rgb),0.18)" strokeWidth="3.5" />
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--k-accent)" strokeWidth="3.5" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" transform="rotate(-90 18 18)" />
          <text x="18" y="21.5" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="var(--k-text)">{pct}%</text>
        </svg>
      ) : (
        <span style={S.miniMulti}>Multi</span>
      )}
    </Link>
  );
}

// Rangée défilante (un thème) : cartes côte à côte, molette, glissement ou flèches.
function TagRow({ label, count, tagKeyValue, items, resolved }) {
  const ref = useRef(null);
  const drag = useRef({ down: false, moved: false, x: 0, left: 0 });
  const [edge, setEdge] = useState({ start: true, end: false });

  const sync = () => {
    const el = ref.current;
    if (!el) return;
    const start = el.scrollLeft <= 4;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdge((e) => (e.start === start && e.end === end ? e : { start, end }));
  };
  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [items.length]);

  const by = (dir) => ref.current?.scrollBy({ left: dir * 620, behavior: "smooth" });

  // Glisser à la souris (sur mobile le doigt suffit déjà).
  const onDown = (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { down: true, moved: false, x: e.clientX, left: ref.current.scrollLeft };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d.down) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      ref.current.classList.add("is-dragging");
    }
    if (d.moved) ref.current.scrollLeft = d.left - dx;
  };
  const onUp = () => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    ref.current?.classList.remove("is-dragging");
    // laisse le clic « fantôme » passer avant de réautoriser les liens
    setTimeout(() => { d.moved = false; }, 0);
  };
  const onClickCapture = (e) => {
    if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); }
  };

  const fade = `${edge.start ? "" : " fade-l"}${edge.end ? "" : " fade-r"}`;
  return (
    <section style={{ marginBottom: "36px" }} aria-label={label}>
      <div style={S.rowHead}>
        <h2 style={S.rowTitle}>{label}<span style={S.rowCount}>{count}</span></h2>
        <div style={S.rowActions}>
          <Link to={`/marches?tag=${encodeURIComponent(tagKeyValue)}`} style={S.topicMore}>Voir tout →</Link>
          <button type="button" aria-label="Précédent" disabled={edge.start} onClick={() => by(-1)} style={{ ...S.arrow, ...(edge.start ? S.arrowOff : null) }}>‹</button>
          <button type="button" aria-label="Suivant" disabled={edge.end} onClick={() => by(1)} style={{ ...S.arrow, ...(edge.end ? S.arrowOff : null) }}>›</button>
        </div>
      </div>
      <div
        ref={ref}
        className={`mk-row-scroll${fade}`}
        onScroll={sync}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerCancel={onUp}
        onClickCapture={onClickCapture}
        onDragStart={(e) => e.preventDefault()}
      >
        {items.map((m) => <div key={m.id} className="mk-row-item"><MarketCard m={m} resolved={resolved} /></div>)}
      </div>
    </section>
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

  // Rangées défilantes : thèmes suivis d'abord, puis les thèmes les plus fournis.
  const tagRows = useMemo(() => {
    const chosen = tags.filter((t) => followed.includes(t.key));
    const others = tags.filter((t) => !followed.includes(t.key) && t.n >= 3);
    return [...chosen, ...others].slice(0, 5).map((t) => ({
      ...t,
      items: [...markets]
        .filter((m) => (m.tags || []).some((x) => tagKey(x) === t.key))
        .sort((a, b) => (b.totalVolume || 0) - (a.totalVolume || 0))
        .slice(0, 12),
    })).filter((r) => r.items.length >= 2);
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
                <span style={S.badge}>{hero.pinnedFeatured ? "★ À la une" : "🔥 Le plus actif"}</span>
                {catsOf(hero)[0] && <span style={S.badgeCat}>{catStyle(hero).e} {catsOf(hero)[0]}</span>}
              </div>
              <h2 className="mk-hero-title" style={S.heroTitle}>{hero.question}</h2>
              {pctOf(hero) !== null ? (
                <div style={S.heroBox}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{pctOf(hero)} %</span>
                    <span style={{ fontSize: "0.9rem", color: "var(--k-muted2)" }}>de chance que OUI</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={S.heroYes}>Oui · {pctOf(hero)}%</div>
                    <div style={S.heroNo}>Non · {100 - pctOf(hero)}%</div>
                  </div>
                </div>
              ) : (
                <div style={S.heroBox}><span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--k-accent-text)" }}>Marché à choix multiples</span></div>
              )}
              <div style={S.heroFootRow}>
                <span style={S.heroChip}>{fmtVol(hero)} échangés</span>
                <span style={S.heroChip}>{whenLabel(hero, false)}</span>
              </div>
            </div>
          </Link>
          <div className="mk-side">
            <div style={S.sideHead}>
              <span style={S.sideTitle}>Se terminent bientôt</span>
              <Link to="/marches?tri=closing" style={S.topicMore}>Tout voir →</Link>
            </div>
            {soon.map((m) => <MiniRow key={m.id} m={m} />)}
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
                {c.items.map((m) => <MiniRow key={m.id} m={m} />)}
                <Link to={`/marches?tag=${encodeURIComponent(c.key)}`} style={S.topicMore}>Voir tout ({c.n}) →</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && !resolved && !filtering && tagRows.map((r) => (
        <TagRow key={r.key} label={r.label} count={r.n} tagKeyValue={r.key} items={r.items} resolved={false} />
      ))}

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
  .mk-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  .mk-card { transition: border-color .15s, filter .15s; }
  .mk-card:hover { border-color: rgba(var(--k-accent-rgb),0.35) !important; filter: brightness(1.08); }
  .mk-skel { height: 200px; border-radius: 14px; background: linear-gradient(90deg,var(--k-surface),var(--k-surface2),var(--k-surface)); background-size: 200% 100%; animation: mkskel 1.4s infinite; }
  @keyframes mkskel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  .mk-hero { display: grid; grid-template-columns: 1.7fr 1fr; gap: 18px; margin-bottom: 40px; }
  .mk-hero-main { display: flex; align-items: flex-end; min-height: 380px; border-radius: 16px; overflow: hidden; text-decoration: none; border: 1px solid var(--k-border); transition: border-color .2s; }
  .mk-hero-main:hover { border-color: var(--k-accent); }
  .mk-side { display: flex; flex-direction: column; gap: 4px; background: var(--k-surface); border: 1px solid var(--k-border); border-radius: 16px; padding: 18px; }
  .mk-mini { display: flex; align-items: center; gap: 12px; padding: 10px 10px; margin: 0 -10px; border-radius: 12px; text-decoration: none; transition: background .15s; text-align: left; }
  .mk-mini:hover { background: rgba(var(--k-accent-rgb),0.1); }
  .mk-hero-main, .mk-side, .mk-topics, .mk-topic-col { text-align: left; }
  .mk-hero-main { box-shadow: 0 10px 40px rgba(var(--k-accent-rgb),0.12); }
  .mk-topics { display: flex; gap: 16px; align-items: stretch; margin: 0 0 40px; }
  .mk-topics-panel { width: 270px; flex-shrink: 0; background: var(--k-inset); border: 1px solid rgba(var(--k-accent-rgb),0.25); border-radius: 16px; padding: 20px; }
  .mk-topics-cols { display: flex; gap: 16px; flex: 1; min-width: 0; overflow-x: auto; padding-bottom: 10px; scrollbar-width: none; -ms-overflow-style: none; }
  .mk-topics-cols::-webkit-scrollbar { display: none; }
  .mk-topic-col { width: 270px; flex-shrink: 0; display: flex; flex-direction: column; background: var(--k-surface); border: 1px solid var(--k-border); border-radius: 16px; padding: 16px 18px; }
  .mk-row-scroll { display: flex; gap: 18px; overflow-x: auto; scroll-snap-type: x proximity; padding: 4px 2px 6px; scrollbar-width: none; -ms-overflow-style: none; cursor: grab; overscroll-behavior-x: contain; }
  .mk-row-scroll::-webkit-scrollbar { display: none; }
  .mk-row-scroll.is-dragging { cursor: grabbing; scroll-snap-type: none; user-select: none; }
  .mk-row-scroll.fade-r { -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 64px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 64px), transparent); }
  .mk-row-scroll.fade-l { -webkit-mask-image: linear-gradient(to left, #000 calc(100% - 64px), transparent); mask-image: linear-gradient(to left, #000 calc(100% - 64px), transparent); }
  .mk-row-scroll.fade-l.fade-r { -webkit-mask-image: linear-gradient(to right, transparent, #000 48px, #000 calc(100% - 64px), transparent); mask-image: linear-gradient(to right, transparent, #000 48px, #000 calc(100% - 64px), transparent); }
  .mk-row-item { flex: 0 0 280px; scroll-snap-align: start; display: flex; }
  .mk-row-item .mk-card { width: 100%; }
  @media (max-width: 600px) { .mk-row-item { flex-basis: 82%; } }
  .mk-pills { scrollbar-width: none; -ms-overflow-style: none; }
  .mk-pills::-webkit-scrollbar { display: none; }
  @media (max-width: 900px) {
    .mk-hero { grid-template-columns: 1fr; }
    .mk-topics { flex-direction: column; }
    .mk-topics-panel { width: 100%; box-sizing: border-box; }
    .mk-hero-main { min-height: 320px; }
  }
  @media (max-width: 600px) {
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
  heroTitle: { fontSize: "1.9rem", fontWeight: 800, color: "#fff", margin: "0 0 18px", lineHeight: 1.2, maxWidth: "640px", textShadow: "0 2px 12px rgba(0,0,0,0.4)" },
  sideTitle: { fontSize: "0.8rem", fontWeight: 700, color: "var(--k-accent-text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" },
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
  coverEmoji: { position: "absolute", right: "-6px", top: "50%", transform: "translateY(-50%) rotate(-8deg)", fontSize: "110px", lineHeight: 1, opacity: 0.35, filter: "saturate(1.2)", userSelect: "none" },
  rowHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px", paddingBottom: "8px", borderBottom: "1px solid var(--k-surface2)" },
  rowTitle: { fontSize: "1.2rem", fontWeight: 700, color: "var(--k-text)", margin: 0, display: "flex", alignItems: "baseline", gap: "10px" },
  rowCount: { fontSize: "0.8rem", fontWeight: 600, color: "var(--k-muted)" },
  rowActions: { display: "flex", alignItems: "center", gap: "10px" },
  arrow: { width: "32px", height: "32px", borderRadius: "50%", border: "1px solid var(--k-border2)", background: "var(--k-surface)", color: "var(--k-text)", fontSize: "1.2rem", lineHeight: 1, cursor: "pointer" },
  arrowOff: { opacity: 0.3, cursor: "default" },
  heroBox: { maxWidth: "460px", padding: "14px 16px", borderRadius: "14px", background: "rgba(var(--k-bg-rgb),0.6)", backdropFilter: "blur(6px)", border: "0.5px solid rgba(var(--k-accent-rgb),0.3)" },
  heroYes: { flex: 1, padding: "9px", borderRadius: "9px", textAlign: "center", border: "0.5px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.14)", color: "#22c55e", fontWeight: 700, fontSize: "0.9rem" },
  heroNo: { flex: 1, padding: "9px", borderRadius: "9px", textAlign: "center", border: "0.5px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.14)", color: "#ef4444", fontWeight: 700, fontSize: "0.9rem" },
  heroFootRow: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" },
  heroChip: { fontSize: "0.78rem", fontWeight: 600, color: "var(--k-text2)", background: "rgba(var(--k-bg-rgb),0.6)", border: "0.5px solid rgba(var(--k-accent-rgb),0.25)", borderRadius: "999px", padding: "5px 12px" },
  sideHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "8px" },
  miniQ: { fontSize: "0.9rem", fontWeight: 600, color: "var(--k-text)", lineHeight: 1.3, marginBottom: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  miniMeta: { display: "flex", alignItems: "center", gap: "5px", fontSize: "0.74rem", color: "var(--k-muted)" },
  miniMulti: { flexShrink: 0, fontSize: "0.72rem", fontWeight: 700, color: "var(--k-accent-text)", border: "1px solid rgba(var(--k-accent-rgb),0.4)", background: "rgba(var(--k-accent-rgb),0.12)", borderRadius: "999px", padding: "5px 10px" },
  multi: { fontWeight: 700, color: "var(--k-accent-text)" },
  more: { display: "block", margin: "28px auto 0", padding: "12px 28px", borderRadius: "10px", background: "transparent", border: "1px solid var(--k-accent)", color: "var(--k-accent-text)", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" },
};
