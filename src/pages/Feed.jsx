import { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link } from "react-router-dom";
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

function MultiLeaderGauge({ marketId }) {
  const [options, setOptions] = useState(null);

  useEffect(() => {
    getDocs(collection(db, "markets", marketId, "options")).then((snap) => {
      setOptions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [marketId]);

  if (!options) {
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
  const [quickBet, setQuickBet] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategories, setActiveCategories] = useState([]);
  const [sortBy, setSortBy] = useState("recent");

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
        const pctYes = isMulti ? null : Math.round((market.poolYes / total) * 100);
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