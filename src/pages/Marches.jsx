import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useSEO } from "../hooks/useSEO";
import { normalize } from "../lib/blogUtils";

const CATEGORIES = ["Sport", "Politique", "Crypto", "Tech", "Économie", "International", "Culture", "Climat", "Autre"];
const PAGE = 30;

const catsOf = (m) => (Array.isArray(m.categories) ? m.categories : m.category ? [m.category] : []);
const pctOf = (m) => {
  if (m.type === "multi") return null;
  const total = (m.poolYes || 0) + (m.poolNo || 0);
  return total > 0 ? Math.round((m.poolNo / total) * 100) : null;
};

// Page « Marchés » : tous les marchés dans une liste compacte, avec recherche et filtres.
export default function Marches() {
  const [params, setParams] = useSearchParams();
  const [markets, setMarkets] = useState([]);
  const [loadedStatus, setLoadedStatus] = useState(null);
  const [visible, setVisible] = useState(PAGE);

  const loading = loadedStatus !== (params.get("statut") || "open");
  const q = params.get("q") || "";
  const cat = params.get("cat") || "";
  const type = params.get("type") || "";
  const status = params.get("statut") || "open";
  const sort = params.get("tri") || "volume";

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

  const list = useMemo(() => {
    const needle = normalize(q).trim();
    const out = markets.filter((m) => {
      if (cat && !catsOf(m).includes(cat)) return false;
      if (type && (m.type === "multi" ? "multi" : "binary") !== type) return false;
      if (!needle) return true;
      const hay = normalize([m.question, ...(m.tags || [])].join(" "));
      return needle.split(/\s+/).every((w) => hay.includes(w));
    });
    if (sort === "closing") out.sort((a, b) => String(a.resolutionDate || "9").localeCompare(String(b.resolutionDate || "9")));
    else if (sort === "volume") out.sort((a, b) => (b.totalVolume || 0) - (a.totalVolume || 0));
    return out;
  }, [markets, q, cat, type, sort]);

  const seo = useSEO({
    title: "Marchés de prédiction",
    description: "Tous les marchés de prédiction de Kassandre : recherche, catégories et résolution.",
    url: "/marches",
  });

  const filtering = Boolean(q || cat || type);

  return (
    <div style={S.page}>
      {seo}
      <h1 style={S.title}>Marchés</h1>
      <p style={S.subtitle}>{status === "resolved" ? "Marchés résolus" : "Marchés ouverts"} · {loading ? "…" : `${list.length} résultat${list.length > 1 ? "s" : ""}`}</p>

      <div style={S.bar}>
        <input type="search" value={q} onChange={(e) => setParam("q", e.target.value)} placeholder="Rechercher un marché ou un thème..." aria-label="Rechercher un marché" style={S.search} />
        <select value={status} onChange={(e) => setParam("statut", e.target.value)} aria-label="Statut" style={S.select}>
          <option value="open">Ouverts</option>
          <option value="resolved">Résolus</option>
        </select>
        <select value={type} onChange={(e) => setParam("type", e.target.value)} aria-label="Type" style={S.select}>
          <option value="">Tous types</option>
          <option value="binary">Oui / Non</option>
          <option value="multi">Multi-choix</option>
        </select>
        <select value={sort} onChange={(e) => setParam("tri", e.target.value)} aria-label="Trier" style={S.select}>
          <option value="volume">Volume</option>
          <option value="recent">Plus récents</option>
          <option value="closing">Résolution proche</option>
        </select>
      </div>

      <div className="mk-cats" style={S.cats}>
        <button style={S.pill(!cat)} onClick={() => setParam("cat", "")}>Toutes</button>
        {CATEGORIES.map((c) => (
          <button key={c} style={S.pill(cat === c)} onClick={() => setParam("cat", cat === c ? "" : c)}>{c}</button>
        ))}
        {filtering && <button style={S.reset} onClick={() => setParams({ ...(status !== "open" ? { statut: status } : {}) }, { replace: true })}>Effacer</button>}
      </div>

      {loading && <p style={S.empty}>Chargement…</p>}
      {!loading && list.length === 0 && <p style={S.empty}>Aucun marché ne correspond à votre recherche.</p>}

      <div style={S.list}>
        {list.slice(0, visible).map((m) => {
          const pct = pctOf(m);
          return (
            <Link key={m.id} to={`/market/${m.id}`} className="mk-row" style={S.row}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={S.q}>{m.question}</div>
                <div style={S.meta}>
                  {catsOf(m).slice(0, 2).join(" · ")}{catsOf(m).length ? " · " : ""}{m.type === "multi" ? "Multi-choix" : "Oui / Non"} · Résolution {m.resolutionDate || "n.c."}
                </div>
              </div>
              <div style={S.side}>
                <div style={S.pct}>{pct !== null ? `${pct} %` : "Multi"}</div>
                <div style={S.vol}>{Math.round(m.totalVolume || 0).toLocaleString("fr-FR")} pts</div>
              </div>
            </Link>
          );
        })}
      </div>

      {list.length > visible && (
        <button style={S.more} onClick={() => setVisible((v) => v + PAGE)}>Voir plus ({list.length - visible})</button>
      )}

      <style>{`
        .mk-row:hover { border-color: var(--k-accent) !important; }
        .mk-cats { scrollbar-width: thin; scrollbar-color: rgba(var(--k-accent-rgb),0.55) transparent; }
        @media (max-width: 700px) { .mk-cats { flex-wrap: nowrap !important; overflow-x: auto; padding-bottom: 6px; } .mk-cats button { flex-shrink: 0; white-space: nowrap; } }
      `}</style>
    </div>
  );
}

const S = {
  page: { maxWidth: "1000px", margin: "0 auto", padding: "36px 20px", minHeight: "calc(100vh - 200px)" },
  title: { fontSize: "2rem", fontWeight: 700, color: "var(--k-text)", margin: "0 0 6px" },
  subtitle: { color: "var(--k-muted)", margin: "0 0 22px", fontSize: "0.95rem" },
  bar: { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" },
  search: { flex: "1 1 260px", minWidth: 0, boxSizing: "border-box", padding: "11px 14px", borderRadius: "10px", border: "1px solid var(--k-border)", background: "var(--k-surface)", color: "var(--k-text)", fontSize: "15px" },
  select: { padding: "0 12px", height: "42px", borderRadius: "10px", border: "1px solid var(--k-border)", background: "var(--k-surface)", color: "var(--k-text)", fontSize: "14px" },
  cats: { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "22px" },
  pill: (on) => ({ fontSize: "0.85rem", padding: "6px 14px", borderRadius: "999px", cursor: "pointer", border: on ? "1px solid var(--k-accent)" : "1px solid var(--k-border)", background: on ? "rgba(var(--k-accent-rgb),0.18)" : "transparent", color: on ? "var(--k-accent-text)" : "var(--k-muted2)" }),
  reset: { background: "none", border: "none", color: "var(--k-accent-text)", cursor: "pointer", textDecoration: "underline", fontSize: "0.85rem" },
  empty: { color: "var(--k-muted2)", textAlign: "center", padding: "30px 0" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  row: { display: "flex", alignItems: "center", gap: "16px", padding: "14px 16px", background: "var(--k-surface)", border: "1px solid var(--k-border)", borderRadius: "12px", textDecoration: "none", color: "inherit", transition: "border-color .15s" },
  q: { fontSize: "0.98rem", fontWeight: 600, color: "var(--k-text)", lineHeight: 1.35, marginBottom: "4px" },
  meta: { fontSize: "0.78rem", color: "var(--k-muted)" },
  side: { textAlign: "right", flexShrink: 0 },
  pct: { fontSize: "1.25rem", fontWeight: 800, color: "var(--k-accent-text)" },
  vol: { fontSize: "0.75rem", color: "var(--k-muted)" },
  more: { display: "block", margin: "24px auto 0", padding: "12px 28px", borderRadius: "10px", background: "transparent", border: "1px solid var(--k-accent)", color: "var(--k-accent-text)", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" },
};
