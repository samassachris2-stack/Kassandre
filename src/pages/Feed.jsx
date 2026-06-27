import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { placeBet, calcShares, getBidAsk } from "../lib/amm.js";

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
  const [searchParams] = useSearchParams();
  const [quickBet, setQuickBet] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategories, setActiveCategories] = useState([]);
  const [sortBy, setSortBy] = useState("recent");

  // Pré-filtrage depuis l'URL (ex: lien "Sport" du footer → /?cat=Sport).
  // On ne lit le param qu'une fois au montage, pas à chaque changement de
  // l'URL, pour ne pas écraser une sélection que l'utilisateur ferait
  // ensuite manuellement avec les pills.
  useEffect(() => {
    const catFromUrl = searchParams.get("cat");
    if (catFromUrl && CATEGORIES.includes(catFromUrl) && catFromUrl !== "Tous") {
      setActiveCategories([catFromUrl]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const visibleMarkets = useMemo(() => {
    let list = markets;

    if (activeCategories.length > 0) {
      list = list.filter((m) => {
        const cats = Array.isArray(m.categories) ? m.categories : (m.category ? [m.category] : []);
        return cats.some((c) => activeCategories.includes(c));
      });
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
  }, [markets, activeCategories, searchTerm, sortBy]);

  return (
    <>
    <div style={{ maxWidth: "900px", margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px", color: "#e8e8f0" }}>Marchés ouverts</h1>

      <FeaturedCarousel markets={markets} />

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

      {visibleMarkets.map((market) => {
        const isMulti = market.type === "multi";
        const total = isMulti ? 0 : market.poolYes + market.poolNo;
        const pctYes = isMulti ? null : Math.round((market.poolNo / total) * 100);
        const pctNo = isMulti ? null : 100 - pctYes;
        const { bid, ask } = isMulti ? { bid: 0, ask: 0 } : getBidAsk(pctYes / 100);

        return (
          <Link
            key={market.id}
            to={`/market/${market.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{
              border: "0.5px solid rgba(124,58,237,0.15)",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "12px",
              cursor: "pointer",
              background: "#13131a",
              transition: "border-color 0.15s, background 0.15s",
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)";
                e.currentTarget.style.background = "#1a1a24";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(124,58,237,0.15)";
                e.currentTarget.style.background = "#13131a";
              }}
            >
              {/* Top row: title + gauge */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
                <p style={{ fontWeight: "500", fontSize: "15px", color: "#e8e8f0", lineHeight: "1.45", flex: 1, margin: 0 }}>
                  {market.question}
                </p>
                {!isMulti && (() => {
                  const circumference = 2 * Math.PI * 26;
                  const offset = circumference * (1 - pctYes / 100);
                  return (
                    <svg width="56" height="56" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
                      <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth="6" />
                      <circle
                        cx="32" cy="32" r="26" fill="none" stroke="#7c3aed" strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform="rotate(-90 32 32)"
                      />
                      <text x="32" y="29" textAnchor="middle" fontSize="15" fontWeight="600" fill="#e8e8f0">{pctYes}%</text>
                      <text x="32" y="42" textAnchor="middle" fontSize="8" fill="#8888a0" letterSpacing="0.5">OUI</text>
                    </svg>
                  );
                })()}
                {isMulti && <MultiLeaderGauge marketId={market.id} />}
              </div>

              {/* OUI / NON boutons cliquables */}
              {!isMulti && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!user) { login(); return; }
                      setQuickBet({ market, side: "yes" });
                    }}
                    style={{
                      flex: 1, padding: "8px", borderRadius: "8px", cursor: "pointer",
                      border: "0.5px solid rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.12)",
                      color: "#22c55e", fontWeight: "600", fontSize: "13px",
                    }}
                  >
                    OUI · {pctYes}%
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!user) { login(); return; }
                      setQuickBet({ market, side: "no" });
                    }}
                    style={{
                      flex: 1, padding: "8px", borderRadius: "8px", cursor: "pointer",
                      border: "0.5px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)",
                      color: "#ef4444", fontWeight: "600", fontSize: "13px",
                    }}
                  >
                    NON · {pctNo}%
                  </button>
                </div>
              )}

              {!isMulti && (
                <div style={{ display: "flex", justifyContent: "center", gap: "6px", fontSize: "11px", marginBottom: "4px" }}>
                  <span style={{ color: "#22c55e" }}>Achat {ask.toFixed(2)} pts</span>
                  <span style={{ color: "#8888a0" }}>·</span>
                  <span style={{ color: "#ef4444" }}>Vente {bid.toFixed(2)} pts</span>
                </div>
              )}

              {isMulti && (
                <p style={{ fontSize: "11px", color: "#8888a0", textAlign: "center", marginTop: "-4px", marginBottom: "8px" }}>
                  Multi-choix
                </p>
              )}

              {/* Footer meta */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#8888a0", marginTop: "4px", flexWrap: "wrap" }}>
                {(Array.isArray(market.categories) ? market.categories : (market.category ? [market.category] : [])).map((cat) => (
                  <span key={cat} style={{
                    fontSize: "11px", fontWeight: "500",
                    background: "rgba(124,58,237,0.12)", color: "#a78bfa",
                    borderRadius: "6px", padding: "2px 8px",
                    border: "0.5px solid rgba(124,58,237,0.2)",
                  }}>{cat}</span>
                ))}
                <span style={{ marginLeft: "auto" }}>Résolution : {market.resolutionDate}</span>
              </div>
            </div>
          </Link>
        );
      })}
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