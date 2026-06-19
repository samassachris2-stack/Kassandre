import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { placeBet, calcShares, getBidAsk } from "../lib/amm.js";

const MULTI_COLORS = ["#7c3aed", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4"];

function MultiOptions({ marketId }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    getDocs(collection(db, "markets", marketId, "options")).then((snap) => {
      const opts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOptions(opts);
    });
  }, [marketId]);

  if (options.length === 0) return (
    <p style={{ fontSize: "12px", color: "#8888a0", marginBottom: "8px" }}>Chargement...</p>
  );

  const numOptions = options.length;
  const top = [...options].sort((a, b) => (b.price ?? 1 / numOptions) - (a.price ?? 1 / numOptions)).slice(0, 3);

  return (
    <div style={{ marginBottom: "8px", display: "flex", flexDirection: "column", gap: "7px" }}>
      {top.map((opt, i) => {
        const pct = Math.round((opt.price ?? 1 / numOptions) * 100);
        const color = MULTI_COLORS[i % MULTI_COLORS.length];
        const isLeader = i === 0;
        const { bid, ask } = isLeader ? getBidAsk(opt.price ?? 1 / numOptions) : { bid: 0, ask: 0 };
        return (
          <div key={opt.id}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
              <span style={{ color: "#e8e8f0", fontWeight: "500" }}>{opt.label}</span>
              <span style={{ color, fontWeight: "600" }}>{pct}%</span>
            </div>
            <div style={{ background: "rgba(124,58,237,0.1)", borderRadius: "99px", height: "4px" }}>
              <div style={{ width: `${pct}%`, background: color, borderRadius: "99px", height: "4px" }} />
            </div>
            {isLeader && (
              <div style={{ display: "flex", gap: "6px", fontSize: "10px", marginTop: "3px" }}>
                <span style={{ color: "#22c55e" }}>Achat {ask.toFixed(2)} pts</span>
                <span style={{ color: "#8888a0" }}>·</span>
                <span style={{ color: "#ef4444" }}>Vente {bid.toFixed(2)} pts</span>
              </div>
            )}
          </div>
        );
      })}
      {options.length > 3 && (
        <p style={{ fontSize: "11px", color: "#8888a0", marginTop: "2px" }}>
          +{options.length - 3} autres options
        </p>
      )}
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

  const [stats, setStats] = useState({ totalMarkets: 0, totalBets: 0, totalUsers: 0 });

useEffect(() => {
  const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
    setStats((prev) => ({ ...prev, totalUsers: snap.size }));
  });
  const unsubBets = onSnapshot(collection(db, "bets"), (snap) => {
    setStats((prev) => ({ ...prev, totalBets: snap.size }));
  });
  return () => { unsubUsers(); unsubBets(); };
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

  return (
    <>
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "24px" }}>Marchés ouverts</h1>

      {markets.length === 0 && (
        <p style={{ color: "#6b6b8a" }}>Aucun marché ouvert pour l'instant.</p>
      )}

      <div style={{
  display: "flex", gap: "16px", marginBottom: "32px",
  padding: "20px", background: "#0f0f17",
  borderRadius: "12px", border: "1px solid #1a1a2e"
}}>
  <div style={{ flex: 1, textAlign: "center" }}>
    <p style={{ fontSize: "28px", fontWeight: "700", color: "#7c3aed" }}>{markets.length}</p>
    <p style={{ fontSize: "12px", color: "#6b6b8a", marginTop: "4px" }}>Marchés ouverts</p>
  </div>
  <div style={{ width: "1px", background: "#1a1a2e" }}/>
  <div style={{ flex: 1, textAlign: "center" }}>
    <p style={{ fontSize: "28px", fontWeight: "700", color: "#7c3aed" }}>{stats.totalBets}</p>
    <p style={{ fontSize: "12px", color: "#6b6b8a", marginTop: "4px" }}>Paris placés</p>
  </div>
  <div style={{ width: "1px", background: "#1a1a2e" }}/>
  <div style={{ flex: 1, textAlign: "center" }}>
    <p style={{ fontSize: "28px", fontWeight: "700", color: "#7c3aed" }}>{stats.totalUsers}</p>
    <p style={{ fontSize: "12px", color: "#6b6b8a", marginTop: "4px" }}>Prophètes</p>
  </div>
</div>

      {markets.map((market) => {
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
              {/* Top row: title + prob badge */}
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
                {isMulti && (
                  <span style={{
                    fontSize: "11px", fontWeight: "500", flexShrink: 0,
                    background: "rgba(124,58,237,0.12)", color: "#a78bfa",
                    borderRadius: "6px", padding: "2px 9px",
                    border: "0.5px solid rgba(124,58,237,0.3)",
                  }}>Multi-choix</span>
                )}
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
                <div style={{ display: "flex", justifyContent: "center", gap: "6px", fontSize: "11px", marginBottom: "10px" }}>
                  <span style={{ color: "#22c55e" }}>Achat {ask.toFixed(2)} pts</span>
                  <span style={{ color: "#8888a0" }}>·</span>
                  <span style={{ color: "#ef4444" }}>Vente {bid.toFixed(2)} pts</span>
                </div>
              )}

              {/* Multi options preview */}
              {isMulti && <MultiOptions marketId={market.id} />}

              {/* Footer meta */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "#8888a0", marginTop: "4px" }}>
                {market.category && (
                  <span style={{
                    fontSize: "11px", fontWeight: "500",
                    background: "rgba(124,58,237,0.12)", color: "#a78bfa",
                    borderRadius: "6px", padding: "2px 8px",
                    border: "0.5px solid rgba(124,58,237,0.2)",
                  }}>{market.category}</span>
                )}
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