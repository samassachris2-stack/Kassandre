import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { placeBet, calcShares } from "../lib/amm.js";

const MULTI_COLORS = ["#7c3aed", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4"];

const CATEGORIES = [
  "Tous", "Sport", "Politique", "Crypto", "Tech", "Économie", "International", "Culture", "Climat", "Autre",
];

const SORT_OPTIONS = [
  { value: "recent", label: "Plus récents" },
  { value: "closing", label: "Résolution proche" },
  { value: "volume", label: "Volume" },
];

function FeaturedCarousel({ markets }) {
  const [index, setIndex] = useState(0);

  const featured = useMemo(() => {
    const pinned = markets.filter((m) => m.pinnedFeatured);
    const rest = markets
      .filter((m) => !m.pinnedFeatured)
      .map((m) => ({
        ...m,
        _volume: m.type === "multi" ? 0 : (m.poolYes || 0) + (m.poolNo || 0),
      }))
      .sort((a, b) => b._volume - a._volume)
      .slice(0, 5);
    // Le(s) marché(s) épinglé(s) passent toujours en tête, suivis du top volume
    const combined = [...pinned, ...rest];
    // Dédoublonne au cas où un marché épinglé serait aussi dans le top volume
    const seen = new Set();
    return combined.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    }).slice(0, 5);
  }, [markets]);

  useEffect(() => {
    if (index >= featured.length) setIndex(0);
  }, [featured, index]);

  if (featured.length === 0) return null;

  const market = featured[index];
  const isMulti = market.type === "multi";
  const total = isMulti ? 0 : (market.poolYes || 0) + (market.poolNo || 0);
  const pctYes = isMulti ? null : Math.round((market.poolNo / total) * 100);

  return (
    <div style={{ marginBottom: "28px" }}>
      <Link to={`/market/${market.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div style={{
          position: "relative",
          borderRadius: "18px",
          overflow: "hidden",
          minHeight: "220px",
          border: "0.5px solid rgba(124,58,237,0.2)",
          background: market.coverImageUrl
            ? `linear-gradient(to right, rgba(10,10,15,0.92), rgba(10,10,15,0.55)), url(${market.coverImageUrl}) center / cover no-repeat`
            : "linear-gradient(135deg, #1a1a2e, #13131a)",
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <div>
            {market.pinnedFeatured && (
              <span style={{
                fontSize: "11px", fontWeight: "700", color: "#f59e0b",
                background: "rgba(245,158,11,0.15)", border: "0.5px solid rgba(245,158,11,0.4)",
                borderRadius: "6px", padding: "3px 10px", marginBottom: "12px", display: "inline-block",
              }}>
                ★ À LA UNE
              </span>
            )}
            <h2 style={{ fontSize: "26px", fontWeight: "700", color: "#fff", margin: "0 0 8px", lineHeight: "1.3", maxWidth: "560px" }}>
              {market.question}
            </h2>
            {(Array.isArray(market.categories) ? market.categories : (market.category ? [market.category] : [])).map((cat) => (
              <span key={cat} style={{
                fontSize: "12px", fontWeight: "500", color: "#c4b5fd",
                background: "rgba(124,58,237,0.2)", borderRadius: "6px",
                padding: "2px 9px", marginRight: "6px",
              }}>{cat}</span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            {!isMulti ? (
              <div>
                <span style={{ fontSize: "42px", fontWeight: "800", color: "#a78bfa", lineHeight: 1 }}>{pctYes}%</span>
                <span style={{ fontSize: "15px", color: "#d4d4d8", marginLeft: "10px" }}>de chance que OUI</span>
              </div>
            ) : (
              <span style={{ fontSize: "15px", color: "#d4d4d8" }}>Multi-choix</span>
            )}
            <span style={{ fontSize: "13px", color: "#a8a8b8" }}>Résolution : {market.resolutionDate}</span>
          </div>
        </div>
      </Link>

      {featured.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "12px" }}>
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? "20px" : "7px", height: "7px", borderRadius: "4px",
                border: "none", cursor: "pointer", padding: 0,
                background: i === index ? "#7c3aed" : "rgba(124,58,237,0.25)",
                transition: "width 0.2s",
              }}
              aria-label={`Marché à la une ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MultiLeaderGauge({ marketId }) {
  const [options, setOptions] = useState(null);

  useEffect(() => {
    getDocs(collection(db, "markets", marketId, "options")).then((snap) => {
      setOptions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [marketId]);

  if (!options || options.length === 0) {
    return <div style={{ width: 56, height: 56, flexShrink: 0 }} />;
  }

  const numOptions = options.length;
  const sorted = [...options].sort((a, b) => (b.price ?? 1 / numOptions) - (a.price ?? 1 / numOptions));
  const leader = sorted[0];
  const leaderIdx = options.findIndex((o) => o.id === leader.id);
  const color = MULTI_COLORS[leaderIdx % MULTI_COLORS.length];
  const pct = Math.round((leader.price ?? 1 / numOptions) * 100);

  const circumference = 2 * Math.PI * 26;
  const offset = circumference * (1 - pct / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, gap: "2px" }}>
      <svg width="56" height="56" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth="6" />
        <circle
          cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="29" textAnchor="middle" fontSize="15" fontWeight="600" fill="#e8e8f0">{pct}%</text>
        <text x="32" y="42" textAnchor="middle" fontSize="7" fill="#8888a0">{leader.label?.slice(0, 8) || "—"}</text>
      </svg>
    </div>
  );
}

function QuickBetModal({ market, side, onClose }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const preview = (() => {
    try {
      return calcShares(market.poolYes, market.poolNo, side, amount);
    } catch {
      return null;
    }
  })();

  async function handleConfirm() {
    if (!user || amount <= 0) return;
    setLoading(true);
    setError("");
    try {
      await placeBet(user.uid, market.id, side, amount);
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const sideColor = side === "yes" ? "#22c55e" : "#ef4444";
  const sideLabel = side === "yes" ? "OUI" : "NON";

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#13131a", border: "0.5px solid rgba(124,58,237,0.25)",
          borderRadius: "16px", padding: "24px", maxWidth: "360px", width: "100%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: "13px", color: "#8888a0", marginBottom: "6px" }}>
          Parier sur
        </p>
        <p style={{ fontSize: "15px", fontWeight: "600", color: "#e8e8f0", marginBottom: "16px", lineHeight: 1.4 }}>
          {market.question}
        </p>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: side === "yes" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `0.5px solid ${side === "yes" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
          borderRadius: "8px", padding: "4px 12px", marginBottom: "16px",
        }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: sideColor }}>{sideLabel}</span>
        </div>

        <input
          type="number" min="1" max={user?.balance ?? 0} value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="Mise en points"
          autoFocus
          style={{
            width: "100%", padding: "10px 14px", borderRadius: "10px",
            border: "0.5px solid rgba(124,58,237,0.2)", background: "#0a0a0f",
            color: "#e8e8f0", marginBottom: "12px", boxSizing: "border-box",
            fontSize: "15px", outline: "none",
          }}
        />

        {preview && (
          <div style={{
            background: "#0a0a0f", borderRadius: "10px", padding: "12px 14px",
            marginBottom: "14px", border: "0.5px solid rgba(124,58,237,0.12)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "3px 0" }}>
              <span style={{ color: "#8888a0" }}>Parts reçues</span>
              <span style={{ fontWeight: "600", color: "#e8e8f0" }}>{preview.shares.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "3px 0" }}>
              <span style={{ color: "#8888a0" }}>Prix par part</span>
              <span style={{ fontWeight: "600", color: "#e8e8f0" }}>{(preview.pricePerShare * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {error && (
          <p style={{ fontSize: "13px", color: "#ef4444", marginBottom: "12px" }}>{error}</p>
        )}

        {success ? (
          <div style={{
            textAlign: "center", padding: "10px", color: "#a78bfa",
            fontSize: "14px", fontWeight: "600",
          }}>
            Pari placé avec succès ✓
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: "12px", borderRadius: "10px",
                border: "0.5px solid rgba(124,58,237,0.2)", background: "transparent",
                color: "#8888a0", fontWeight: "600", cursor: "pointer", fontSize: "14px",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                flex: 2, padding: "12px", borderRadius: "10px", border: "none",
                background: loading ? "#3a2066" : "#7c3aed", color: "#fff",
                fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px",
              }}
            >
              {loading ? "En cours..." : `Parier ${amount} pts`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Feed() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { cat: catFromRoute, tag: tagFromRoute } = useParams();
  const [quickBet, setQuickBet] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategories, setActiveCategories] = useState([]);
  const [sortBy, setSortBy] = useState("recent");
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagsExpanded, setTagsExpanded] = useState(false);

  // Pré-filtrage depuis la route (ex: lien "Sport" du footer → /Sport,
  // ou badge tag sur une card → /Politique/Trump). Réagit à catFromRoute
  // et tagFromRoute pour gérer la navigation directe d'une page à une
  // autre (même composant Feed réutilisé par React Router, donc pas de
  // remontage entre les deux).
  useEffect(() => {
    if (catFromRoute && CATEGORIES.includes(catFromRoute) && catFromRoute !== "Tous") {
      setActiveCategories([catFromRoute]);
    } else if (!catFromRoute) {
      setActiveCategories([]);
    }
    // tagFromRoute scope toujours à l'intérieur de catFromRoute (URL /:cat/:tag)
    setSelectedTag(tagFromRoute || null);
    setTagsExpanded(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [catFromRoute, tagFromRoute]);

  useEffect(() => {
    const q = query(
      collection(db, "markets"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMarkets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return unsubscribe;
  }, []);

  // Marchés de la catégorie active, AVANT filtre par tag — sert de base pour
  // calculer la liste de tags disponibles et leur compteur dans la sidebar.
  const marketsInCategory = useMemo(() => {
    if (activeCategories.length === 0) return markets;
    return markets.filter((m) => {
      const cats = Array.isArray(m.categories) ? m.categories : (m.category ? [m.category] : []);
      return cats.some((c) => activeCategories.includes(c));
    });
  }, [markets, activeCategories]);

  const tagsInCategory = useMemo(() => {
    const counts = {};
    marketsInCategory.forEach((m) => {
      (m.tags || []).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [marketsInCategory, catFromRoute]);

  const visibleMarkets = useMemo(() => {
    let list = marketsInCategory;

    if (selectedTag) {
      list = list.filter((m) => (m.tags || []).includes(selectedTag));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter((m) => m.question?.toLowerCase().includes(term));
    }

    const sorted = [...list];
    if (sortBy === "closing") {
      sorted.sort((a, b) => new Date(a.resolutionDate) - new Date(b.resolutionDate));
    } else if (sortBy === "volume") {
      sorted.sort((a, b) => {
        const volA = a.type === "multi" ? 0 : (a.poolYes || 0) + (a.poolNo || 0);
        const volB = b.type === "multi" ? 0 : (b.poolYes || 0) + (b.poolNo || 0);
        return volB - volA;
      });
    }
    // "recent" garde l'ordre déjà fourni par la requête Firestore (createdAt desc)

    return sorted;
  }, [marketsInCategory, selectedTag, searchTerm, sortBy]);

  useEffect(() => {
    document.title = tagFromRoute
      ? `${catFromRoute} — #${tagFromRoute} — Kassandre`
      : catFromRoute
      ? `${catFromRoute} — Kassandre`
      : "Kassandre — Marchés ouverts";
  }, [catFromRoute, tagFromRoute]);

  return (
    <>
    <style>{`
      .kassandre-feed-layout { display: flex; }
      .kassandre-feed-sidebar::-webkit-scrollbar { display: none; }
      .kassandre-feed-sidebar { scrollbar-width: none; }
      @media (max-width: 720px) {
        .kassandre-feed-layout { flex-direction: column; }
        .kassandre-feed-sidebar { position: static !important; flex: none !important; width: 100%; max-height: none !important; overflow-y: visible !important; }
        .kassandre-tags-collapse-sticky {
          position: sticky;
          bottom: 12px;
          z-index: 10;
          background: #15151f !important;
          border: 0.5px solid rgba(124,58,237,0.3) !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        }
      }
    `}</style>
    <div className="kassandre-feed-layout" style={{
      maxWidth: "1140px",
      margin: "40px auto",
      padding: "0 16px",
      gap: "28px",
      alignItems: "flex-start",
    }}>
      <aside className="kassandre-feed-sidebar" style={{
        flex: "0 0 200px",
        position: "sticky",
        top: "76px",
        maxHeight: "calc(100vh - 96px)",
        overflowY: "auto",
        paddingRight: "4px",
      }}>
        <button
          onClick={() => {
            if (tagFromRoute && catFromRoute) {
              navigate(`/${encodeURIComponent(catFromRoute)}`);
            } else {
              setSelectedTag(null);
            }
          }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", padding: "10px 12px", marginBottom: "4px",
            borderRadius: "8px", cursor: "pointer", textAlign: "left",
            border: "none",
            background: !selectedTag ? "rgba(124,58,237,0.15)" : "transparent",
            color: !selectedTag ? "#a78bfa" : "#a8a8b8",
            fontWeight: !selectedTag ? "600" : "500",
            fontSize: "14px",
          }}
        >
          <span>Tous</span>
          <span style={{ fontSize: "12px", color: "#6b6b8a" }}>{marketsInCategory.length}</span>
        </button>
        {(tagsExpanded ? tagsInCategory : tagsInCategory.slice(0, 12)).map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => {
              if (selectedTag === tag) {
                // Désélection : retour à la catégorie seule si on est sur une route avec tag
                if (catFromRoute) {
                  navigate(`/${encodeURIComponent(catFromRoute)}`);
                } else {
                  setSelectedTag(null);
                }
              } else if (catFromRoute) {
                // Navigation vers la vraie route /:cat/:tag
                navigate(`/${encodeURIComponent(catFromRoute)}/${encodeURIComponent(tag)}`);
              } else {
                // Pas de catégorie dans l'URL (Feed général) : filtre en state uniquement
                setSelectedTag(tag);
              }
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "10px 12px", marginBottom: "4px",
              borderRadius: "8px", cursor: "pointer", textAlign: "left",
              border: "none",
              background: selectedTag === tag ? "rgba(124,58,237,0.15)" : "transparent",
              color: selectedTag === tag ? "#a78bfa" : "#a8a8b8",
              fontWeight: selectedTag === tag ? "600" : "500",
              fontSize: "14px",
            }}
          >
            <span>{tag}</span>
            <span style={{ fontSize: "12px", color: "#6b6b8a" }}>{count}</span>
          </button>
        ))}
        {tagsInCategory.length > 12 && (
          <button
            onClick={() => setTagsExpanded((v) => !v)}
            className={tagsExpanded ? "kassandre-tags-collapse-sticky" : ""}
            style={{
              width: "100%", padding: "8px 12px", marginTop: "4px",
              borderRadius: "8px", cursor: "pointer", textAlign: "left",
              border: "none", background: "transparent",
              color: "#7c3aed", fontWeight: "600", fontSize: "13px",
            }}
          >
            {tagsExpanded ? "▲ Voir moins" : `Voir plus (+${tagsInCategory.length - 12})`}
          </button>
        )}
        {tagsInCategory.length === 0 && (
          <p style={{ fontSize: "12px", color: "#6b6b8a", padding: "10px 12px" }}>
            {tagFromRoute
              ? "Aucun autre tag pour cette sélection."
              : catFromRoute
              ? "Aucun tag pour cette catégorie."
              : "Aucun tag pour l'instant."}
          </p>
        )}
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px", color: "#e8e8f0" }}>
        {tagFromRoute
          ? `Marchés — ${catFromRoute} — #${tagFromRoute}`
          : activeCategories.length > 0
          ? `Marchés — ${activeCategories.join(", ")}`
          : "Marchés ouverts"}
      </h1>

      {!catFromRoute && !tagFromRoute && <FeaturedCarousel markets={markets} />}

      {/* ── Barre de recherche ── */}
      <input
        type="text"
        placeholder="Rechercher un marché..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: "100%", padding: "11px 16px", borderRadius: "10px",
          border: "0.5px solid rgba(124,58,237,0.2)", background: "#0f0f17",
          color: "#e8e8f0", fontSize: "14px", outline: "none",
          marginBottom: "14px", boxSizing: "border-box",
        }}
      />

      {/* ── Pills catégories + tri ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1 }}>
          {CATEGORIES.map((cat) => {
            const isTous = cat === "Tous";
            const active = isTous ? activeCategories.length === 0 : activeCategories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => {
                  if (isTous) {
                    setActiveCategories([]);
                  } else {
                    setActiveCategories((prev) =>
                      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                    );
                  }
                }}
                style={{
                  padding: "6px 13px", borderRadius: "20px", cursor: "pointer",
                  fontSize: "13px", fontWeight: "500",
                  border: active ? "0.5px solid rgba(124,58,237,0.5)" : "0.5px solid rgba(124,58,237,0.15)",
                  background: active ? "rgba(124,58,237,0.18)" : "transparent",
                  color: active ? "#a78bfa" : "#8888a0",
                  transition: "all 0.15s",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: "7px 12px", borderRadius: "8px",
            border: "0.5px solid rgba(124,58,237,0.15)", background: "#0f0f17",
            color: "#a8a8b8", fontSize: "13px", outline: "none", cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {visibleMarkets.length === 0 && (
        <p style={{ color: "#6b6b8a" }}>Aucun marché ne correspond à ta recherche.</p>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "14px",
      }}>
        {visibleMarkets.map((market) => {
          const isMulti = market.type === "multi";
          const total = isMulti ? 0 : market.poolYes + market.poolNo;
          const pctYes = isMulti ? null : Math.round((market.poolNo / total) * 100);
          const pctNo = isMulti ? null : 100 - pctYes;
          const volume = isMulti ? 0 : Math.round(total);

          return (
            <Link
              key={market.id}
              to={`/market/${market.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="kassandre-market-card"
                style={{
                  border: "0.5px solid rgba(124,58,237,0.15)",
                  borderRadius: "14px",
                  padding: "16px",
                  cursor: "pointer",
                  background: market.coverImageUrl
                    ? `linear-gradient(160deg, rgba(10,10,15,0.78), rgba(10,10,15,0.94)), url(${market.coverImageUrl}) center / cover no-repeat`
                    : "#13131a",
                  transition: "border-color 0.15s, filter 0.15s",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)";
                  e.currentTarget.style.filter = "brightness(1.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(124,58,237,0.15)";
                  e.currentTarget.style.filter = "brightness(1)";
                }}
              >
                {/* Top row: titre + gauge */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                  <p style={{
                    fontWeight: "500", fontSize: "14px", color: "#e8e8f0", lineHeight: "1.35",
                    flex: 1, margin: 0,
                    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {market.question}
                  </p>
                  {!isMulti && (() => {
                    const circumference = 2 * Math.PI * 18;
                    const offset = circumference * (1 - pctYes / 100);
                    return (
                      <svg width="42" height="42" viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
                        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth="4" />
                        <circle
                          cx="22" cy="22" r="18" fill="none" stroke="#7c3aed" strokeWidth="4"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          transform="rotate(-90 22 22)"
                        />
                        <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="600" fill="#e8e8f0">{pctYes}%</text>
                      </svg>
                    );
                  })()}
                  {isMulti && <MultiLeaderGauge marketId={market.id} />}
                </div>

                {/* Badges tags cliquables */}
                {(market.tags || []).length > 0 && (
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "10px" }}>
                    {market.tags.slice(0, 3).map((tag) => {
                      const cats = Array.isArray(market.categories)
                        ? market.categories
                        : (market.category ? [market.category] : []);
                      const cat = cats[0] || "Autre";
                      return (
                        <button
                          key={tag}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/${encodeURIComponent(cat)}/${encodeURIComponent(tag)}`);
                          }}
                          style={{
                            fontSize: "11px", fontWeight: "500", color: "#a78bfa",
                            background: "rgba(124,58,237,0.12)", border: "0.5px solid rgba(124,58,237,0.25)",
                            borderRadius: "6px", padding: "2px 8px", cursor: "pointer",
                          }}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Boutons OUI / NON compacts */}
                {!isMulti && (
                  <div style={{ display: "flex", gap: "6px", marginTop: "auto", marginBottom: "10px" }}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!user) { login(); return; }
                        setQuickBet({ market, side: "yes" });
                      }}
                      style={{
                        flex: 1, padding: "7px", borderRadius: "7px", cursor: "pointer",
                        border: "0.5px solid rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.12)",
                        color: "#22c55e", fontWeight: "600", fontSize: "12px",
                      }}
                    >
                      Oui · {pctYes}%
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!user) { login(); return; }
                        setQuickBet({ market, side: "no" });
                      }}
                      style={{
                        flex: 1, padding: "7px", borderRadius: "7px", cursor: "pointer",
                        border: "0.5px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)",
                        color: "#ef4444", fontWeight: "600", fontSize: "12px",
                      }}
                    >
                      Non · {pctNo}%
                    </button>
                  </div>
                )}

                {isMulti && (
                  <p style={{ fontSize: "11px", color: "#8888a0", marginTop: "auto", marginBottom: "10px" }}>
                    Multi-choix
                  </p>
                )}

                {/* Footer meta : volume + résolution */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#8888a0" }}>
                  <span>{!isMulti ? `${volume} pts Vol.` : "—"}</span>
                  <span>Résolution : {market.resolutionDate}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      </div>
    </div>

    {quickBet && (
      <QuickBetModal
        market={quickBet.market}
        side={quickBet.side}
        onClose={() => setQuickBet(null)}
      />
    )}
    </>
  );
}