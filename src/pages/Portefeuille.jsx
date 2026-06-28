import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import {
  calcShares, placeBet, calcSellShares, sellShares,
  calcSharesLMSR, placeBetMulti, calcSellSharesLMSR, sellSharesMulti,
  defaultLiquidityB,
} from "../lib/amm.js";

const S = {
  page: {
    maxWidth: "780px",
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
    marginBottom: "20px",
    padding: "20px",
    background: "#0f0f17",
    borderRadius: "12px",
    border: "0.5px solid rgba(124,58,237,0.15)",
  },
  summaryItem: { flex: 1, textAlign: "center" },
  summaryValue: { fontSize: "24px", fontWeight: "700", color: "#a78bfa", margin: 0 },
  summaryValuePositive: { fontSize: "24px", fontWeight: "700", color: "#22c55e", margin: 0 },
  summaryValueNegative: { fontSize: "24px", fontWeight: "700", color: "#ef4444", margin: 0 },
  summaryLabel: { fontSize: "12px", color: "#8888a0", marginTop: "4px" },
  summaryDivider: { width: "0.5px", background: "rgba(124,58,237,0.15)" },
  chartWrap: {
    background: "#0f0f17",
    border: "0.5px solid rgba(124,58,237,0.15)",
    borderRadius: "12px",
    padding: "16px 16px 8px",
    marginBottom: "24px",
  },
  chartLabel: {
    fontSize: "12px",
    color: "#8888a0",
    marginBottom: "8px",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  tabRow: {
    display: "flex",
    gap: "6px",
    marginBottom: "16px",
    background: "#0f0f17",
    borderRadius: "10px",
    padding: "4px",
    width: "fit-content",
  },
  tabBtn: (active) => ({
    padding: "7px 16px",
    borderRadius: "8px",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    background: active ? "rgba(124,58,237,0.2)" : "transparent",
    color: active ? "#a78bfa" : "#8888a0",
  }),
  controlsRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "18px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  filterBtn: (active) => ({
    padding: "6px 12px",
    borderRadius: "8px",
    border: active ? "0.5px solid rgba(124,58,237,0.5)" : "0.5px solid rgba(124,58,237,0.15)",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    background: active ? "rgba(124,58,237,0.12)" : "transparent",
    color: active ? "#a78bfa" : "#8888a0",
  }),
  sortSelect: {
    marginLeft: "auto",
    padding: "6px 10px",
    borderRadius: "8px",
    border: "0.5px solid rgba(124,58,237,0.15)",
    background: "#0f0f17",
    color: "#e8e8f0",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    outline: "none",
  },
  emptyState: { textAlign: "center", padding: "60px 20px", color: "#8888a0" },
  emptyLink: { color: "#a78bfa", textDecoration: "none", fontWeight: "600" },
  posCard: {
    background: "#13131a",
    border: "0.5px solid rgba(124,58,237,0.15)",
    borderRadius: "14px",
    marginBottom: "12px",
    overflow: "hidden",
    transition: "border-color 0.15s",
  },
  posCardHeader: {
    padding: "18px 20px",
    cursor: "pointer",
  },
  posTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "10px",
  },
  posQuestion: { fontSize: "14px", fontWeight: "500", color: "#e8e8f0", margin: 0, lineHeight: "1.4" },
  posBadgeGroup: { display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 },
  posSideBadge: (color) => ({
    fontSize: "11px",
    fontWeight: "600",
    color,
    background: `${color}18`,
    border: `0.5px solid ${color}55`,
    borderRadius: "6px",
    padding: "3px 9px",
    textTransform: "uppercase",
  }),
  resolvedBadge: (won) => ({
    fontSize: "11px",
    fontWeight: "600",
    color: won ? "#22c55e" : "#ef4444",
    background: won ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
    border: `0.5px solid ${won ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
    borderRadius: "6px",
    padding: "3px 9px",
  }),
  posStatsRow: { display: "flex", gap: "20px", fontSize: "13px", flexWrap: "wrap" },
  posStat: { display: "flex", flexDirection: "column", gap: "2px" },
  posStatLabel: { fontSize: "11px", color: "#8888a0" },
  posStatValue: { fontWeight: "600", color: "#e8e8f0" },
  pnlPositive: { fontWeight: "600", color: "#22c55e" },
  pnlNegative: { fontWeight: "600", color: "#ef4444" },
  expandHint: { fontSize: "11px", color: "#8888a0", marginTop: "10px" },
  detailPanel: {
    borderTop: "0.5px solid rgba(124,58,237,0.12)",
    padding: "16px 20px 20px",
    background: "#0f0f17",
  },
  detailChartLabel: {
    fontSize: "11px",
    color: "#8888a0",
    marginBottom: "8px",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  txRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    padding: "8px 0",
    borderBottom: "0.5px solid rgba(124,58,237,0.08)",
  },
  txLabel: { color: "#a8a8b8" },
  txAmount: { fontWeight: "600", color: "#e8e8f0" },
};

const MULTI_COLORS = ["#7c3aed", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4"];

function TradeModal({ pos, onClose, onDone }) {
  const { user } = useAuth();
  const [mode, setMode] = useState("buy"); // "buy" | "sell"
  const [amount, setAmount] = useState(10);
  const [sellAmount, setSellAmount] = useState(0);
  const [marketLive, setMarketLive] = useState(null);
  const [optionsLive, setOptionsLive] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const mSnap = await getDoc(doc(db, "markets", pos.marketId));
      if (mSnap.exists()) setMarketLive({ id: pos.marketId, ...mSnap.data() });
      if (pos.type === "multi") {
        const optsSnap = await getDocs(query(collection(db, "markets", pos.marketId, "options"), orderBy("createdAt", "asc")));
        setOptionsLive(optsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
      setLoadingData(false);
    }
    load();
  }, [pos]);

  const buyPreview = (() => {
    if (loadingData || !marketLive || amount <= 0) return null;
    try {
      if (pos.type === "multi") {
        const optIdx = optionsLive.findIndex((o) => o.id === pos.optionId);
        if (optIdx === -1) return null;
        const quantities = optionsLive.map((o) => o.q || 0);
        const b = marketLive.liquidityB || defaultLiquidityB(optionsLive.length);
        return calcSharesLMSR(quantities, b, optIdx, amount);
      }
      return calcShares(marketLive.poolYes, marketLive.poolNo, pos.side, amount);
    } catch { return null; }
  })();

  const sellPreview = (() => {
    if (loadingData || !marketLive || sellAmount <= 0) return null;
    try {
      if (pos.type === "multi") {
        const optIdx = optionsLive.findIndex((o) => o.id === pos.optionId);
        if (optIdx === -1) return null;
        const quantities = optionsLive.map((o) => o.q || 0);
        const b = marketLive.liquidityB || defaultLiquidityB(optionsLive.length);
        return calcSellSharesLMSR(quantities, b, optIdx, sellAmount);
      }
      return calcSellShares(marketLive.poolYes, marketLive.poolNo, pos.side, sellAmount);
    } catch { return null; }
  })();

  async function handleBuy() {
    if (!user || amount <= 0) return;
    setLoading(true);
    setError("");
    try {
      if (pos.type === "multi") await placeBetMulti(user.uid, pos.marketId, pos.optionId, amount);
      else await placeBet(user.uid, pos.marketId, pos.side, amount);
      setSuccess(true);
      setTimeout(() => { onDone(); onClose(); }, 1100);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleSell() {
    if (!user || sellAmount <= 0 || sellAmount > pos.shares) return;
    setLoading(true);
    setError("");
    try {
      if (pos.type === "multi") await sellSharesMulti(user.uid, pos.marketId, pos.optionId, sellAmount);
      else await sellShares(user.uid, pos.marketId, pos.side, sellAmount);
      setSuccess(true);
      setTimeout(() => { onDone(); onClose(); }, 1100);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const sideLabel = pos.type === "multi" ? pos.optionLabel : (pos.side === "yes" ? "OUI" : "NON");

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
          borderRadius: "16px", padding: "24px", maxWidth: "380px", width: "100%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: "13px", color: "#8888a0", marginBottom: "6px" }}>Trader sur</p>
        <p style={{ fontSize: "15px", fontWeight: "600", color: "#e8e8f0", marginBottom: "14px", lineHeight: 1.4 }}>
          {pos.question}
        </p>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: `${pos.color}18`, border: `0.5px solid ${pos.color}55`,
          borderRadius: "8px", padding: "4px 12px", marginBottom: "16px",
        }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: pos.color }}>{sideLabel}</span>
        </div>

        <div style={{
          display: "flex", gap: "6px", marginBottom: "16px",
          background: "#0a0a0f", borderRadius: "10px", padding: "4px",
        }}>
          <button
            onClick={() => setMode("buy")}
            style={{
              flex: 1, padding: "7px", borderRadius: "8px", border: "none",
              fontWeight: "600", fontSize: "13px", cursor: "pointer",
              background: mode === "buy" ? "rgba(124,58,237,0.2)" : "transparent",
              color: mode === "buy" ? "#a78bfa" : "#8888a0",
            }}
          >
            Acheter
          </button>
          <button
            onClick={() => setMode("sell")}
            style={{
              flex: 1, padding: "7px", borderRadius: "8px", border: "none",
              fontWeight: "600", fontSize: "13px", cursor: "pointer",
              background: mode === "sell" ? "rgba(239,68,68,0.15)" : "transparent",
              color: mode === "sell" ? "#ef4444" : "#8888a0",
            }}
          >
            Vendre
          </button>
        </div>

        {loadingData ? (
          <p style={{ fontSize: "13px", color: "#8888a0", textAlign: "center", padding: "20px 0" }}>Chargement...</p>
        ) : success ? (
          <div style={{ textAlign: "center", padding: "10px", color: "#a78bfa", fontSize: "14px", fontWeight: "600" }}>
            {mode === "buy" ? "Pari placé avec succès ✓" : "Vente effectuée ✓"}
          </div>
        ) : mode === "buy" ? (
          <>
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
            {buyPreview && (
              <div style={{
                background: "#0a0a0f", borderRadius: "10px", padding: "12px 14px",
                marginBottom: "14px", border: "0.5px solid rgba(124,58,237,0.12)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "3px 0" }}>
                  <span style={{ color: "#8888a0" }}>Parts reçues</span>
                  <span style={{ fontWeight: "600", color: "#e8e8f0" }}>{buyPreview.shares.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "3px 0" }}>
                  <span style={{ color: "#8888a0" }}>Prix par part</span>
                  <span style={{ fontWeight: "600", color: "#e8e8f0" }}>{buyPreview.pricePerShare.toFixed(2)} pts</span>
                </div>
              </div>
            )}
            {error && <p style={{ fontSize: "13px", color: "#ef4444", marginBottom: "12px" }}>{error}</p>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={onClose} style={{
                flex: 1, padding: "12px", borderRadius: "10px",
                border: "0.5px solid rgba(124,58,237,0.2)", background: "transparent",
                color: "#8888a0", fontWeight: "600", cursor: "pointer", fontSize: "14px",
              }}>Annuler</button>
              <button onClick={handleBuy} disabled={loading} style={{
                flex: 2, padding: "12px", borderRadius: "10px", border: "none",
                background: loading ? "#3a2066" : "#7c3aed", color: "#fff",
                fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px",
              }}>
                {loading ? "En cours..." : `Acheter ${amount} pts`}
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              type="number" min="0.01" step="0.01" max={pos.shares} value={sellAmount}
              onChange={(e) => setSellAmount(Number(e.target.value))}
              placeholder={`Max ${pos.shares.toFixed(2)} parts`}
              autoFocus
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "10px",
                border: "0.5px solid rgba(124,58,237,0.2)", background: "#0a0a0f",
                color: "#e8e8f0", marginBottom: "12px", boxSizing: "border-box",
                fontSize: "15px", outline: "none",
              }}
            />
            {sellPreview && (
              <div style={{
                background: "#0a0a0f", borderRadius: "10px", padding: "12px 14px",
                marginBottom: "14px", border: "0.5px solid rgba(124,58,237,0.12)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "3px 0" }}>
                  <span style={{ color: "#8888a0" }}>Tu récupères</span>
                  <span style={{ fontWeight: "600", color: "#22c55e" }}>{sellPreview.proceeds.toFixed(2)} pts</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "3px 0" }}>
                  <span style={{ color: "#8888a0" }}>Prix par part</span>
                  <span style={{ fontWeight: "600", color: "#e8e8f0" }}>{sellPreview.pricePerShare.toFixed(2)} pts</span>
                </div>
              </div>
            )}
            {error && <p style={{ fontSize: "13px", color: "#ef4444", marginBottom: "12px" }}>{error}</p>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={onClose} style={{
                flex: 1, padding: "12px", borderRadius: "10px",
                border: "0.5px solid rgba(124,58,237,0.2)", background: "transparent",
                color: "#8888a0", fontWeight: "600", cursor: "pointer", fontSize: "14px",
              }}>Annuler</button>
              <button
                onClick={handleSell}
                disabled={loading || sellAmount <= 0 || sellAmount > pos.shares}
                style={{
                  flex: 2, padding: "12px", borderRadius: "10px", border: "none",
                  background: (loading || sellAmount <= 0 || sellAmount > pos.shares) ? "#3a2066" : "rgba(239,68,68,0.85)",
                  color: "#fff", fontWeight: "600",
                  cursor: (loading || sellAmount <= 0 || sellAmount > pos.shares) ? "not-allowed" : "pointer",
                  fontSize: "14px",
                }}
              >
                {loading ? "En cours..." : `Vendre ${sellAmount > 0 ? sellAmount.toFixed(2) : ""} parts`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", marginLeft: "6px" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-label="Informations"
        style={{
          width: "16px", height: "16px", borderRadius: "50%",
          border: "1px solid #6b6b8a", background: "transparent",
          color: "#6b6b8a", fontSize: "10px", fontWeight: "700",
          lineHeight: "1", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        i
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "20px", right: 0, zIndex: 20,
          width: "220px", padding: "10px 12px", borderRadius: "8px",
          background: "#1a1a26", border: "1px solid rgba(124,58,237,0.3)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          fontSize: "12px", color: "#c8c8d8", lineHeight: "1.5",
          textAlign: "left", fontWeight: "400",
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

function ExpandedDetail({ pos }) {
  const [history, setHistory] = useState([]);
  const [txs, setTxs] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(true);

  useEffect(() => {
    async function load() {
      const betsQ = query(
        collection(db, "bets"),
        where("marketId", "==", pos.marketId),
        where("userId", "==", pos.userId)
      );
      const betsSnap = await getDocs(betsQ);
      const relevantBets = betsSnap.docs
        .map((d) => d.data())
        .filter((b) => pos.type === "multi" ? b.optionId === pos.optionId : b.side === pos.side)
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setTxs(relevantBets);

      const priceHistQ = query(collection(db, "markets", pos.marketId, "priceHistory"), orderBy("timestamp", "asc"));
      const priceHistSnap = await getDocs(priceHistQ);

      let cumulativeShares = 0;
      let cumulativeCost = 0;
      let betIdx = 0;
      const points = [];

      priceHistSnap.docs.forEach((d) => {
        const data = d.data();
        const ts = data.timestamp?.toDate();
        if (!ts) return;

        while (betIdx < relevantBets.length && relevantBets[betIdx].createdAt?.toDate() <= ts) {
          cumulativeShares += relevantBets[betIdx].shares;
          cumulativeCost += relevantBets[betIdx].amount;
          betIdx++;
        }

        let price;
        if (pos.type === "multi") {
          price = (data[pos.optionId] ?? 0) / 100;
        } else {
          price = pos.side === "yes" ? (data.pctYes ?? 0) / 100 : (data.pctNo ?? 0) / 100;
        }

        points.push({
          time: ts.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          valeur: cumulativeShares * price,
          cout: cumulativeCost,
        });
      });

      setHistory(points);
      setLoadingDetail(false);
    }
    load();
  }, [pos]);

  return (
    <div style={S.detailPanel}>
      {!loadingDetail && history.length > 1 && (
        <>
          <p style={{ ...S.detailChartLabel, display: "flex", alignItems: "center" }}>
            Évolution de la valeur
            <InfoTooltip text="La courbe pleine montre la valeur actuelle de tes parts. La courbe pointillée montre combien tu as investi au total. Si la courbe pleine est sous la pointillée, tu es en perte." />
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={history}>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6b6b8a" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6b6b8a" }} width={36} />
              <Tooltip
                formatter={(v, name) => [`${v.toFixed(2)} pts`, name === "valeur" ? "Valeur" : "Coût investi"]}
                contentStyle={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} formatter={(v) => (v === "valeur" ? "Valeur" : "Coût investi")} />
              <Line type="monotone" dataKey="valeur" stroke={pos.color} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cout" stroke="#6b6b8a" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}

      <p style={{ ...S.detailChartLabel, marginTop: "16px" }}>Transactions</p>
      {txs.length === 0 && <p style={{ fontSize: "12px", color: "#8888a0" }}>Aucune transaction.</p>}
      {txs.map((tx, i) => {
        const isSell = tx.type === "sell";
        return (
          <div key={i} style={S.txRow}>
            <span style={S.txLabel}>
              {isSell ? "Vente" : "Achat"} · {tx.createdAt?.toDate()?.toLocaleDateString("fr-FR") || "—"}
            </span>
            <span style={S.txAmount}>
              {isSell ? "+" : ""}{Math.abs(tx.amount).toFixed(2)} pts
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Portefeuille() {
  const { user } = useAuth();
  const [positions, setPositions] = useState([]);
  const [resolvedPositions, setResolvedPositions] = useState([]);
  const [valueHistory, setValueHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState("open");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [sortBy, setSortBy] = useState("value");
  const [expandedId, setExpandedId] = useState(null);
  const [tradingPos, setTradingPos] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function load() {
      try {
        const posQ = query(collection(db, "positions"), where("userId", "==", user.uid));
        const posSnap = await getDocs(posQ);
        const allRaw = posSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const marketIds = [...new Set(allRaw.map((p) => p.marketId))];
        const marketsData = {};
        await Promise.all(marketIds.map(async (mid) => {
          const mSnap = await getDoc(doc(db, "markets", mid));
          if (mSnap.exists()) marketsData[mid] = { id: mid, ...mSnap.data() };
        }));

        const enriched = await Promise.all(allRaw.map(async (pos) => {
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
            const pctYes = total > 0 ? market.poolNo / total : 0.5;
            currentPrice = pos.side === "yes" ? pctYes : 1 - pctYes;
            color = pos.side === "yes" ? "#22c55e" : "#ef4444";
          }

          const isResolved = market.status === "resolved";
          const won = isResolved && (
            pos.type === "multi" ? market.outcome === pos.optionId : market.outcome === pos.side
          );
          const currentValue = isResolved ? (won ? pos.shares : 0) : pos.shares * currentPrice;
          const totalCost = pos.totalCost || 0;
          const pnl = currentValue - totalCost;
          const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

          return {
            ...pos,
            question: market.question,
            status: market.status,
            marketType: market.type === "multi" ? "multi" : "binary",
            categories: Array.isArray(market.categories) ? market.categories : (market.category ? [market.category] : []),
            isResolved,
            won,
            currentPrice,
            currentValue,
            totalCost,
            pnl,
            pnlPct,
            optionLabel,
            color,
            lastUpdated: pos.lastUpdated?.toMillis ? pos.lastUpdated.toMillis() : 0,
          };
        }));

        const valid = enriched.filter(Boolean);
        setPositions(valid.filter((p) => !p.isResolved && p.shares > 0.01));
        setResolvedPositions(valid.filter((p) => p.isResolved));

        const betsQ = query(collection(db, "bets"), where("userId", "==", user.uid));
        const betsSnap = await getDocs(betsQ);
        const allBets = betsSnap.docs
          .map((d) => d.data())
          .filter((b) => b.createdAt)
          .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);

        // Complète marketsData avec les marchés référencés uniquement par des bets
        // (au cas où une position aurait été entièrement liquidée et ne serait plus
        // couverte par la requête "positions" ci-dessus)
        const betMarketIds = [...new Set(allBets.map((b) => b.marketId))];
        const missingMarketIds = betMarketIds.filter((mid) => !marketsData[mid]);
        await Promise.all(missingMarketIds.map(async (mid) => {
          const mSnap = await getDoc(doc(db, "markets", mid));
          if (mSnap.exists()) marketsData[mid] = { id: mid, ...mSnap.data() };
        }));

        if (allBets.length > 0) {          // Charge le priceHistory de chaque marché concerné
          const priceHistories = {};
          await Promise.all(betMarketIds.map(async (mid) => {
            const phQ = query(collection(db, "markets", mid, "priceHistory"), orderBy("timestamp", "asc"));
            const phSnap = await getDocs(phQ);
            priceHistories[mid] = phSnap.docs
              .map((d) => d.data())
              .filter((p) => p.timestamp)
              .map((p) => ({ ...p, ts: p.timestamp.toDate().getTime() }));
          }));

          // Construit une clé de position unique par marché/côté(ou option)
          function posKey(bet) {
            return bet.type === "multi" ? `${bet.marketId}_${bet.optionId}` : `${bet.marketId}_${bet.side}`;
          }

          // État courant des parts détenues par position, mis à jour au fil du temps
          const sharesByPos = {};
          const costByPos = {};
          const marketIdByPos = {};
          const sideOrOptionByPos = {};
          allBets.forEach((b) => {
            const key = posKey(b);
            sharesByPos[key] = 0;
            costByPos[key] = 0;
            marketIdByPos[key] = b.marketId;
            sideOrOptionByPos[key] = b.type === "multi" ? b.optionId : b.side;
          });

          // Fusionne tous les points de prix de tous les marchés concernés en une
          // seule timeline, avec le marketId associé à chaque point
          const allPricePoints = [];
          betMarketIds.forEach((mid) => {
            (priceHistories[mid] || []).forEach((p) => {
              allPricePoints.push({ marketId: mid, ts: p.ts, data: p });
            });
          });
          allPricePoints.sort((a, b) => a.ts - b.ts);

          // Dernier prix connu par position (clé identique à posKey), mis à jour
          // au fil de la timeline de prix
          const lastPriceByPos = {};

          let betIdx = 0;
          const points = [];

          for (const pricePoint of allPricePoints) {
            // Applique tous les bets survenus avant ou au moment de ce point de prix
            while (betIdx < allBets.length && allBets[betIdx].createdAt.toMillis() <= pricePoint.ts) {
              const b = allBets[betIdx];
              const key = posKey(b);
              sharesByPos[key] = (sharesByPos[key] || 0) + b.shares;
              costByPos[key] = (costByPos[key] || 0) + b.amount;
              betIdx++;
            }

            // Met à jour le dernier prix connu pour les positions de CE marché
            const market = marketsData[pricePoint.marketId];
            const isMultiMarket = market?.type === "multi";

            if (isMultiMarket) {
              // Le point contient un % par optionId (ex: { gadi_eizenkot: 31, ... })
              Object.keys(pricePoint.data).forEach((field) => {
                if (field === "timestamp" || field === "ts") return;
                const key = `${pricePoint.marketId}_${field}`;
                lastPriceByPos[key] = pricePoint.data[field] / 100;
              });
            } else {
              lastPriceByPos[`${pricePoint.marketId}_yes`] = (pricePoint.data.pctYes ?? 0) / 100;
              lastPriceByPos[`${pricePoint.marketId}_no`] = (pricePoint.data.pctNo ?? 0) / 100;
            }

            // Calcule la valeur totale du portefeuille à cet instant : somme sur
            // toutes les positions connues de (parts détenues × dernier prix connu),
            // et le coût total investi à ce même instant, pour tracer le gain/perte net.
            // Pour un marché déjà résolu, le prix est figé au résultat réel (1 ou 0)
            // plutôt qu'au dernier % de marché, qui ne reflète pas l'issue finale.
            let totalValue = 0;
            let totalCostAtPoint = 0;
            Object.keys(sharesByPos).forEach((key) => {
              const shares = sharesByPos[key];
              if (shares > 0.001) {
                const posMarket = marketsData[marketIdByPos[key]];
                const sideOrOption = sideOrOptionByPos[key];
                let price;
                if (posMarket?.status === "resolved") {
                  const won = posMarket.outcome === sideOrOption;
                  price = won ? 1 : 0;
                } else {
                  price = lastPriceByPos[key] ?? 0;
                }
                totalValue += shares * price;
                totalCostAtPoint += costByPos[key] || 0;
              }
            });

            const d = new Date(pricePoint.ts);
            points.push({
              time: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
              valeur: totalValue,
              cout: totalCostAtPoint,
            });
          }

          // Applique les éventuels bets restants après le dernier point de prix connu
          while (betIdx < allBets.length) {
            const b = allBets[betIdx];
            const key = posKey(b);
            sharesByPos[key] = (sharesByPos[key] || 0) + b.shares;
            costByPos[key] = (costByPos[key] || 0) + b.amount;
            betIdx++;
          }

          setValueHistory(points);
        }
      } catch (e) {
        console.error("Erreur chargement portefeuille:", e);
        setError(e.message);
      }
      setLoading(false);
    }
    load();
  }, [user, refreshKey]);

  const displayedPositions = useMemo(() => {
    let list = tab === "open" ? positions : resolvedPositions;
    if (typeFilter !== "all") list = list.filter((p) => p.marketType === typeFilter);
    if (categoryFilter.length > 0) {
      list = list.filter((p) => (p.categories || []).some((c) => categoryFilter.includes(c)));
    }
    const sorted = [...list];
    if (sortBy === "value") sorted.sort((a, b) => b.currentValue - a.currentValue);
    else if (sortBy === "pnl") sorted.sort((a, b) => b.pnl - a.pnl);
    else if (sortBy === "date") sorted.sort((a, b) => b.lastUpdated - a.lastUpdated);
    return sorted;
  }, [tab, positions, resolvedPositions, typeFilter, categoryFilter, sortBy]);

  if (!user) {
    return <div style={S.page}><div style={S.emptyState}>Connecte-toi pour voir ton portefeuille.</div></div>;
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

      {valueHistory.length > 1 && (
        <div style={S.chartWrap}>
          <p style={{ ...S.chartLabel, display: "flex", alignItems: "center", justifyContent: "center" }}>
            Évolution de la valeur du portefeuille
            <InfoTooltip text="La courbe pleine montre la valeur actuelle de toutes tes positions. La courbe pointillée montre combien tu as misé au total. Si la pleine est sous la pointillée, ton portefeuille est en perte." />
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={valueHistory}>
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b6b8a" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b6b8a" }} width={40} />
              <Tooltip
                formatter={(v, name) => [`${v.toFixed(2)} pts`, name === "valeur" ? "Valeur" : "Coût investi"]}
                contentStyle={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} formatter={(v) => (v === "valeur" ? "Valeur" : "Coût investi")} />
              <Line type="monotone" dataKey="valeur" stroke="#7c3aed" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cout" stroke="#6b6b8a" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={S.tabRow}>
        <button style={S.tabBtn(tab === "open")} onClick={() => { setTab("open"); setExpandedId(null); }}>
          Ouvertes ({positions.length})
        </button>
        <button style={S.tabBtn(tab === "resolved")} onClick={() => { setTab("resolved"); setExpandedId(null); }}>
          Résolues ({resolvedPositions.length})
        </button>
      </div>

      <div style={S.controlsRow}>
        <button style={S.filterBtn(typeFilter === "all")} onClick={() => setTypeFilter("all")}>Tous</button>
        <button style={S.filterBtn(typeFilter === "binary")} onClick={() => setTypeFilter("binary")}>Oui/Non</button>
        <button style={S.filterBtn(typeFilter === "multi")} onClick={() => setTypeFilter("multi")}>Multi-choix</button>
        <select style={S.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="value">Trier par valeur</option>
          <option value="pnl">Trier par gain/perte</option>
          <option value="date">Trier par date</option>
        </select>
      </div>

      <div style={{ ...S.controlsRow, marginTop: "-8px" }}>
        {["Sport", "Politique", "Crypto", "Tech", "Économie", "International", "Culture", "Climat", "Autre"].map((cat) => {
          const active = categoryFilter.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter((prev) =>
                  active ? prev.filter((c) => c !== cat) : [...prev, cat]
                );
              }}
              style={S.filterBtn(active)}
            >
              {cat}
            </button>
          );
        })}
        {categoryFilter.length > 0 && (
          <button
            onClick={() => setCategoryFilter([])}
            style={{ ...S.filterBtn(false), color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {displayedPositions.length === 0 && (
        <div style={S.emptyState}>
          {tab === "open" ? "Aucune position ouverte pour l'instant." : "Aucune position résolue pour l'instant."}
          {tab === "open" && (
            <>
              <br />
              <Link to="/" style={S.emptyLink}>Découvrir les marchés ouverts →</Link>
            </>
          )}
        </div>
      )}

      {displayedPositions.map((pos) => {
        const isExpanded = expandedId === pos.id;
        return (
          <div key={pos.id} style={S.posCard}>
            <div style={S.posCardHeader} onClick={() => setExpandedId(isExpanded ? null : pos.id)}>
              <div style={S.posTop}>
                <p style={S.posQuestion}>{pos.question}</p>
                <div style={S.posBadgeGroup}>
                  <span style={S.posSideBadge(pos.color)}>
                    {pos.type === "multi" ? pos.optionLabel : (pos.side === "yes" ? "OUI" : "NON")}
                  </span>
                  {pos.isResolved && (
                    <span style={S.resolvedBadge(pos.won)}>{pos.won ? "Gagné" : "Perdu"}</span>
                  )}
                </div>
              </div>
              <div style={S.posStatsRow}>
                <div style={S.posStat}>
                  <span style={S.posStatLabel}>Parts</span>
                  <span style={S.posStatValue}>{pos.shares.toFixed(2)}</span>
                </div>
                <div style={S.posStat}>
                  <span style={S.posStatLabel}>{pos.isResolved ? "Résultat" : "Prix actuel"}</span>
                  <span style={S.posStatValue}>
                    {pos.isResolved ? `${pos.currentValue.toFixed(2)} pts` : `${pos.currentPrice.toFixed(2)} pts`}
                  </span>
                </div>
                {!pos.isResolved && (
                  <div style={S.posStat}>
                    <span style={S.posStatLabel}>Valeur</span>
                    <span style={S.posStatValue}>{pos.currentValue.toFixed(2)} pts</span>
                  </div>
                )}
                <div style={S.posStat}>
                  <span style={S.posStatLabel}>Gain/perte</span>
                  <span style={pos.pnl >= 0 ? S.pnlPositive : S.pnlNegative}>
                    {pos.pnl >= 0 ? "+" : ""}{pos.pnl.toFixed(2)} ({pos.pnl >= 0 ? "+" : ""}{pos.pnlPct.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                <p style={{ ...S.expandHint, margin: 0 }}>{isExpanded ? "▲ Masquer le détail" : "▼ Voir le détail"}</p>
                {!pos.isResolved && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setTradingPos(pos); }}
                    style={{
                      fontSize: "12px", fontWeight: "600", color: "#a78bfa",
                      background: "rgba(124,58,237,0.12)", border: "0.5px solid rgba(124,58,237,0.3)",
                      borderRadius: "7px", padding: "5px 12px", cursor: "pointer",
                    }}
                  >
                    Trader
                  </button>
                )}
              </div>
            </div>
            {isExpanded && <ExpandedDetail pos={pos} />}
          </div>
        );
      })}

      {tradingPos && (
        <TradeModal
          pos={tradingPos}
          onClose={() => setTradingPos(null)}
          onDone={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}