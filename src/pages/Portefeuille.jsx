import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

const S = {
  page: {
    maxWidth: "760px",
    margin: "40px auto",
    padding: "0 16px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#e8e8f0",
    marginBottom: "24px",
  },
  summaryRow: {
    display: "flex",
    gap: "16px",
    marginBottom: "32px",
    padding: "20px",
    background: "#0f0f17",
    borderRadius: "12px",
    border: "0.5px solid rgba(124,58,237,0.15)",
  },
  summaryItem: {
    flex: 1,
    textAlign: "center",
  },
  summaryValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#a78bfa",
    margin: 0,
  },
  summaryValuePositive: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#22c55e",
    margin: 0,
  },
  summaryValueNegative: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#ef4444",
    margin: 0,
  },
  summaryLabel: {
    fontSize: "12px",
    color: "#8888a0",
    marginTop: "4px",
  },
  summaryDivider: {
    width: "0.5px",
    background: "rgba(124,58,237,0.15)",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#8888a0",
  },
  emptyLink: {
    color: "#a78bfa",
    textDecoration: "none",
    fontWeight: "600",
  },
  posCard: {
    background: "#13131a",
    border: "0.5px solid rgba(124,58,237,0.15)",
    borderRadius: "14px",
    padding: "18px 20px",
    marginBottom: "12px",
    textDecoration: "none",
    display: "block",
    transition: "border-color 0.15s, background 0.15s",
  },
  posTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "10px",
  },
  posQuestion: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#e8e8f0",
    margin: 0,
    lineHeight: "1.4",
  },
  posSideBadge: (color) => ({
    fontSize: "11px",
    fontWeight: "600",
    color,
    background: `${color}18`,
    border: `0.5px solid ${color}55`,
    borderRadius: "6px",
    padding: "3px 9px",
    flexShrink: 0,
    textTransform: "uppercase",
  }),
  posStatsRow: {
    display: "flex",
    gap: "20px",
    fontSize: "13px",
  },
  posStat: { display: "flex", flexDirection: "column", gap: "2px" },
  posStatLabel: { fontSize: "11px", color: "#8888a0" },
  posStatValue: { fontWeight: "600", color: "#e8e8f0" },
  pnlPositive: { fontWeight: "600", color: "#22c55e" },
  pnlNegative: { fontWeight: "600", color: "#ef4444" },
};

const MULTI_COLORS = ["#7c3aed", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4"];

export default function Portefeuille() {
  const { user } = useAuth();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function load() {
      try {
        const posQ = query(collection(db, "positions"), where("userId", "==", user.uid));
        const posSnap = await getDocs(posQ);
        const rawPositions = posSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.shares > 0.01);

        const marketIds = [...new Set(rawPositions.map((p) => p.marketId))];
        const marketsData = {};
        await Promise.all(marketIds.map(async (mid) => {
          const mSnap = await getDoc(doc(db, "markets", mid));
          if (mSnap.exists()) marketsData[mid] = { id: mid, ...mSnap.data() };
        }));

        const enriched = await Promise.all(rawPositions.map(async (pos) => {
          const market = marketsData[pos.marketId];
          if (!market) return null;

          let currentPrice = 0;
          let optionLabel = null;
          let color = "#7c3aed";

          if (pos.type === "multi") {
            const optSnap = await getDoc(doc(db, "markets", pos.marketId, "options", pos.optionId));
            if (optSnap.exists()) {
              const optData = optSnap.data();
              currentPrice = optData.price ?? 0;
              optionLabel = optData.label || pos.optionId.replace(/_/g, " ");
            }
            const optsSnap = await getDocs(collection(db, "markets", pos.marketId, "options"));
            const idx = optsSnap.docs.findIndex((d) => d.id === pos.optionId);
            color = MULTI_COLORS[idx % MULTI_COLORS.length] || "#7c3aed";
          } else {
            const total = (market.poolYes || 0) + (market.poolNo || 0);
            const pctYes = total > 0 ? market.poolYes / total : 0.5;
            currentPrice = pos.side === "yes" ? pctYes : 1 - pctYes;
            color = pos.side === "yes" ? "#22c55e" : "#ef4444";
          }

          const currentValue = pos.shares * currentPrice;
          const totalCost = pos.totalCost || 0;
          const pnl = currentValue - totalCost;
          const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

          return {
            ...pos,
            question: market.question,
            status: market.status,
            currentPrice,
            currentValue,
            totalCost,
            pnl,
            pnlPct,
            optionLabel,
            color,
          };
        }));

        setPositions(enriched.filter(Boolean).sort((a, b) => b.currentValue - a.currentValue));
      } catch (e) {
        console.error("Erreur chargement portefeuille:", e);
        setError(e.message);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  if (!user) {
    return (
      <div style={S.page}>
        <div style={S.emptyState}>Connecte-toi pour voir ton portefeuille.</div>
      </div>
    );
  }

  if (error) return <p style={{ padding: "40px", color: "#ef4444" }}>Erreur : {error}</p>;
  if (loading) return <p style={{ padding: "40px", color: "#8888a0" }}>Chargement...</p>;

  const totalValue = positions.reduce((acc, p) => acc + p.currentValue, 0);
  const totalCost = positions.reduce((acc, p) => acc + p.totalCost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div style={S.page}>
      <h1 style={S.title}>Portefeuille</h1>

      {positions.length > 0 && (
        <div style={S.summaryRow}>
          <div style={S.summaryItem}>
            <p style={S.summaryValue}>{totalValue.toFixed(2)}</p>
            <p style={S.summaryLabel}>Valeur actuelle</p>
          </div>
          <div style={S.summaryDivider} />
          <div style={S.summaryItem}>
            <p style={S.summaryValue}>{totalCost.toFixed(2)}</p>
            <p style={S.summaryLabel}>Mise totale</p>
          </div>
          <div style={S.summaryDivider} />
          <div style={S.summaryItem}>
            <p style={totalPnl >= 0 ? S.summaryValuePositive : S.summaryValueNegative}>
              {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}
            </p>
            <p style={S.summaryLabel}>
              Gain/perte latent {totalCost > 0 && `(${totalPnl >= 0 ? "+" : ""}${totalPnlPct.toFixed(1)}%)`}
            </p>
          </div>
        </div>
      )}

      {positions.length === 0 && (
        <div style={S.emptyState}>
          Aucune position ouverte pour l'instant.
          <br />
          <Link to="/" style={S.emptyLink}>Découvrir les marchés ouverts →</Link>
        </div>
      )}

      {positions.map((pos) => (
        <Link key={pos.id} to={`/market/${pos.marketId}`} style={S.posCard}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)"; e.currentTarget.style.background = "#1a1a24"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.15)"; e.currentTarget.style.background = "#13131a"; }}
        >
          <div style={S.posTop}>
            <p style={S.posQuestion}>{pos.question}</p>
            <span style={S.posSideBadge(pos.color)}>
              {pos.type === "multi" ? pos.optionLabel : (pos.side === "yes" ? "OUI" : "NON")}
            </span>
          </div>
          <div style={S.posStatsRow}>
            <div style={S.posStat}>
              <span style={S.posStatLabel}>Parts</span>
              <span style={S.posStatValue}>{pos.shares.toFixed(2)}</span>
            </div>
            <div style={S.posStat}>
              <span style={S.posStatLabel}>Prix actuel</span>
              <span style={S.posStatValue}>{pos.currentPrice.toFixed(2)} pts</span>
            </div>
            <div style={S.posStat}>
              <span style={S.posStatLabel}>Valeur</span>
              <span style={S.posStatValue}>{pos.currentValue.toFixed(2)} pts</span>
            </div>
            <div style={S.posStat}>
              <span style={S.posStatLabel}>Gain/perte</span>
              <span style={pos.pnl >= 0 ? S.pnlPositive : S.pnlNegative}>
                {pos.pnl >= 0 ? "+" : ""}{pos.pnl.toFixed(2)} ({pos.pnl >= 0 ? "+" : ""}{pos.pnlPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}