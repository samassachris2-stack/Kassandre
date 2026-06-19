import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { placeBet, calcShares, calcSellShares, sellShares, placeBetMulti, calcSharesLMSR, calcSellSharesLMSR, sellSharesMulti, defaultLiquidityB, getBidAsk } from "../lib/amm.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { doc, onSnapshot, collection, getDocs, query, orderBy } from "firebase/firestore";

const S = {
  layoutWrap: {
    maxWidth: "1040px",
    margin: "40px auto",
    padding: "0 16px",
    display: "grid",
    gridTemplateColumns: "1fr 360px",
    gap: "32px",
    alignItems: "start",
  },
  mainCol: {
    minWidth: 0,
  },
  sideCol: {
    position: "sticky",
    top: "24px",
  },
  // ── Header ──────────────────────────────────────────
  tagRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  tag: {
    fontSize: "11px",
    fontWeight: "500",
    background: "rgba(124,58,237,0.12)",
    color: "#a78bfa",
    borderRadius: "6px",
    padding: "2px 9px",
    border: "0.5px solid rgba(124,58,237,0.3)",
  },
  statusDot: {
    fontSize: "11px",
    color: "#8888a0",
  },
  title: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#e8e8f0",
    lineHeight: "1.4",
    marginBottom: "0",
    flex: 1,
  },
  headerProbBadge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "rgba(124,58,237,0.12)",
    border: "0.5px solid rgba(124,58,237,0.3)",
    borderRadius: "10px",
    padding: "6px 14px",
    minWidth: "62px",
    flexShrink: 0,
  },
  headerProbBadgeNumber: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#a78bfa",
    lineHeight: 1,
  },
  headerProbBadgeLabel: {
    fontSize: "10px",
    color: "#8888a0",
    marginTop: "2px",
    letterSpacing: "0.05em",
  },
  // ── Prob display ─────────────────────────────────────
  probDisplay: {
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
    marginBottom: "14px",
  },
  bigProb: {
    fontSize: "42px",
    fontWeight: "700",
    color: "#a78bfa",
    lineHeight: "1",
  },
  probInfo: {
    display: "flex",
    flexDirection: "column",
    paddingBottom: "5px",
    gap: "2px",
  },
  probSubtitle: {
    fontSize: "13px",
    color: "#8888a0",
  },
  bidAskRow: {
    fontSize: "11px",
    marginTop: "2px",
    fontWeight: "500",
  },
  // ── Bar ──────────────────────────────────────────────
  barWrap: {
    height: "6px",
    borderRadius: "99px",
    overflow: "hidden",
    display: "flex",
    marginBottom: "6px",
  },
  barLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    marginBottom: "24px",
  },
  // ── Stats row ─────────────────────────────────────────
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginBottom: "28px",
  },
  statCard: {
    background: "#13131a",
    border: "0.5px solid rgba(124,58,237,0.15)",
    borderRadius: "10px",
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  statValue: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#e8e8f0",
  },
  statLabel: {
    fontSize: "11px",
    color: "#8888a0",
  },
  // ── Chart ─────────────────────────────────────────────
  chartWrap: {
    marginBottom: "28px",
  },
  chartLabel: {
    fontSize: "12px",
    color: "#8888a0",
    marginBottom: "10px",
    fontWeight: "500",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  // ── Multi options ─────────────────────────────────────
  multiOption: {
    marginBottom: "10px",
  },
  multiOptRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    marginBottom: "5px",
    fontWeight: "500",
  },
  // ── Bet panel ─────────────────────────────────────────
  betPanel: {
    background: "#13131a",
    border: "0.5px solid rgba(124,58,237,0.2)",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "24px",
  },
  betTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#e8e8f0",
    marginBottom: "14px",
  },
  modeToggle: {
    display: "flex",
    gap: "6px",
    marginBottom: "14px",
    background: "#0a0a0f",
    borderRadius: "10px",
    padding: "4px",
  },
  modeBtn: (active, isSell) => ({
    flex: 1, padding: "7px", borderRadius: "8px", border: "none",
    fontWeight: "600", fontSize: "13px", cursor: "pointer",
    background: active ? (isSell ? "rgba(239,68,68,0.15)" : "rgba(124,58,237,0.2)") : "transparent",
    color: active ? (isSell ? "#ef4444" : "#a78bfa") : "#8888a0",
    transition: "all 0.15s",
  }),
  positionBox: {
    background: "#0a0a0f",
    border: "0.5px solid rgba(124,58,237,0.12)",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "14px",
  },
  positionLabel: {
    fontSize: "11px",
    color: "#8888a0",
    marginBottom: "4px",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  sideButtons: {
    display: "flex",
    gap: "8px",
    marginBottom: "14px",
  },
  btnYesActive: {
    flex: 1, padding: "10px", borderRadius: "10px", border: "0.5px solid rgba(34,197,94,0.4)",
    background: "rgba(34,197,94,0.15)", color: "#22c55e", fontWeight: "600", cursor: "pointer", fontSize: "14px",
  },
  btnYesInactive: {
    flex: 1, padding: "10px", borderRadius: "10px", border: "0.5px solid rgba(124,58,237,0.15)",
    background: "transparent", color: "#8888a0", fontWeight: "600", cursor: "pointer", fontSize: "14px",
  },
  btnNoActive: {
    flex: 1, padding: "10px", borderRadius: "10px", border: "0.5px solid rgba(239,68,68,0.4)",
    background: "rgba(239,68,68,0.15)", color: "#ef4444", fontWeight: "600", cursor: "pointer", fontSize: "14px",
  },
  btnNoInactive: {
    flex: 1, padding: "10px", borderRadius: "10px", border: "0.5px solid rgba(124,58,237,0.15)",
    background: "transparent", color: "#8888a0", fontWeight: "600", cursor: "pointer", fontSize: "14px",
  },
  amountInput: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "0.5px solid rgba(124,58,237,0.2)",
    background: "#0a0a0f",
    color: "#e8e8f0",
    marginBottom: "12px",
    boxSizing: "border-box",
    fontSize: "15px",
    outline: "none",
  },
  previewBox: {
    background: "#0a0a0f",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "14px",
    border: "0.5px solid rgba(124,58,237,0.12)",
  },
  previewRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    padding: "3px 0",
  },
  previewLabel: { color: "#8888a0" },
  previewValue: { fontWeight: "600", color: "#e8e8f0" },
  betCta: {
    width: "100%",
    padding: "12px",
    background: "#7c3aed",
    color: "#fff",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px",
  },
  betCtaDisabled: {
    width: "100%",
    padding: "12px",
    background: "#3a2066",
    color: "#8888a0",
    borderRadius: "10px",
    border: "none",
    cursor: "not-allowed",
    fontWeight: "600",
    fontSize: "15px",
  },
  successMsg: {
    marginTop: "12px",
    padding: "10px 14px",
    background: "rgba(124,58,237,0.1)",
    border: "0.5px solid rgba(124,58,237,0.3)",
    borderRadius: "10px",
    fontSize: "13px",
    color: "#a78bfa",
    marginBottom: "10px",
  },
  shareBtn: {
    width: "100%",
    padding: "10px",
    background: "#000",
    color: "#fff",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "14px",
  },
  footer: {
    fontSize: "12px",
    color: "#4a4a5a",
    marginTop: "4px",
  },
  footerLink: { color: "#7c3aed" },
  notLoggedIn: {
    fontSize: "14px",
    color: "#8888a0",
    padding: "16px 20px",
    background: "#13131a",
    border: "0.5px solid rgba(124,58,237,0.15)",
    borderRadius: "12px",
    marginBottom: "24px",
  },
};

const MULTI_COLORS = ["#7c3aed", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4"];

export default function Market() {
  const { id } = useParams();
  const { user } = useAuth();
  const [market, setMarket] = useState(null);
  const [options, setOptions] = useState([]);
  const [side, setSide] = useState("yes");
  const [selectedOption, setSelectedOption] = useState(null);
  const [amount, setAmount] = useState(10);
  const [sellAmount, setSellAmount] = useState(0);
  const [mode, setMode] = useState("buy"); // "buy" | "sell"
  const [positions, setPositions] = useState({}); // { [side|optionId]: shares }
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [multiHistory, setMultiHistory] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "markets", id), (snap) => {
      if (snap.exists()) setMarket({ id: snap.id, ...snap.data() });
    });
    return unsubscribe;
  }, [id]);

  // Charge les positions de l'utilisateur sur ce marché en temps réel
  useEffect(() => {
    if (!user || !id) return;
    const sides = ["yes", "no"];
    const unsubs = sides.map((s) =>
      onSnapshot(doc(db, "positions", `${user.uid}_${id}_${s}`), (snap) => {
        setPositions((prev) => ({
          ...prev,
          [s]: snap.exists() ? snap.data().shares : 0,
        }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [user, id]);

  // Charge les positions multi en temps réel une fois les options chargées
  useEffect(() => {
    if (!user || !id || options.length === 0) return;
    const unsubs = options.map((opt) =>
      onSnapshot(doc(db, "positions", `${user.uid}_${id}_${opt.id}`), (snap) => {
        setPositions((prev) => ({
          ...prev,
          [opt.id]: snap.exists() ? snap.data().shares : 0,
        }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [user, id, options]);

  useEffect(() => {
    if (!market || market.type === "multi") return;
    const q = query(collection(db, "markets", id, "priceHistory"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPriceHistory(snap.docs.map((d) => {
        const data = d.data();
        const ts = data.timestamp?.toDate();
        return {
          time: ts ? ts.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "",
          oui: data.pctYes,
        };
      }));
    });
    return unsubscribe;
  }, [market, id]);

  useEffect(() => {
    if (!market || market.type !== "multi") return;
    async function loadOptions() {
      const q = query(collection(db, "markets", id, "options"), orderBy("createdAt", "asc"));
      const snap = await getDocs(q);
      const opts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOptions(opts);
      if (opts.length > 0) setSelectedOption(opts[0].id);
    }
    loadOptions();
  }, [market]);

  useEffect(() => {
    if (!market || market.type !== "multi" || options.length === 0) return;
    const q = query(collection(db, "markets", id, "priceHistory"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const optionIds = options.map((o) => o.id);
      setMultiHistory(snap.docs.map((d) => {
        const data = d.data();
        const ts = data.timestamp?.toDate();
        const entry = { time: ts ? ts.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "" };
        optionIds.forEach((oid) => { if (data[oid] !== undefined) entry[oid] = data[oid]; });
        return entry;
      }));
    });
    return unsubscribe;
  }, [market, id, options]);

  useEffect(() => {
    if (!market || amount <= 0) return;
    try {
      if (market.type === "multi") {
        if (options.length === 0) return;
        const optionIndex = options.findIndex((o) => o.id === selectedOption);
        if (optionIndex === -1) return;
        const quantities = options.map((o) => o.q || 0);
        const b = market.liquidityB || defaultLiquidityB(options.length);
        setPreview(calcSharesLMSR(quantities, b, optionIndex, amount));
      } else {
        setPreview(calcShares(market.poolYes, market.poolNo, side, amount));
      }
    } catch {
      setPreview(null);
    }
  }, [market, side, amount, selectedOption, options]);

  async function handleBet() {
    if (!user || !market || amount <= 0) return;
    setLoading(true);
    try {
      if (market.type === "multi") {
        await placeBetMulti(user.uid, id, selectedOption, amount);
      } else {
        await placeBet(user.uid, id, side, amount);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  }

  async function handleSell() {
    if (!user || !market || sellAmount <= 0) return;
    setLoading(true);
    try {
      if (market.type === "multi") {
        await sellSharesMulti(user.uid, id, selectedOption, sellAmount);
      } else {
        await sellShares(user.uid, id, side, sellAmount);
      }
      setSellAmount(0);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  }

  // Preview de vente
  const sellPreview = (() => {
    if (!market || sellAmount <= 0) return null;
    try {
      if (market.type === "multi") {
        const optIdx = options.findIndex((o) => o.id === selectedOption);
        if (optIdx === -1) return null;
        const quantities = options.map((o) => o.q || 0);
        const b = market.liquidityB || defaultLiquidityB(options.length);
        return calcSellSharesLMSR(quantities, b, optIdx, sellAmount);
      } else {
        return calcSellShares(market.poolYes, market.poolNo, side, sellAmount);
      }
    } catch { return null; }
  })();

  function shareOnTwitter() {
    const sideLabel = market.type === "multi"
      ? options.find((o) => o.id === selectedOption)?.label
      : side === "yes" ? "OUI" : "NON";
    const text = `Je parie sur "${sideLabel}" :\n\n"${market.question}"\n\nTu penses quoi ? 👁 kassandre.app`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }

  if (!market) return <p style={{ padding: "40px", color: "#8888a0" }}>Chargement...</p>;

  const isMulti = market.type === "multi";
  const total = isMulti ? 0 : market.poolYes + market.poolNo;
  const pctYes = isMulti ? null : Math.round((market.poolYes / total) * 100);
  const pctNo = isMulti ? null : 100 - pctYes;

  const statusLabel = market.status === "open" ? "Ouvert" : market.status === "closed" ? "Fermé" : "Résolu";

  return (
    <>
      <style>{`
        @media (max-width: 860px) {
          .kassandre-market-layout {
            grid-template-columns: 1fr !important;
          }
          .kassandre-market-sidecol {
            position: static !important;
            top: auto !important;
          }
        }
      `}</style>
      <div style={S.layoutWrap} className="kassandre-market-layout">
        <div style={S.mainCol}>

      {/* ── Header ── */}
      <div style={S.tagRow}>
        {market.category && <span style={S.tag}>{market.category}</span>}
        <span style={S.statusDot}>· {statusLabel}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
        <h1 style={S.title}>{market.question}</h1>
        {!isMulti && (
          <div style={S.headerProbBadge}>
            <span style={S.headerProbBadgeNumber}>{pctYes}%</span>
            <span style={S.headerProbBadgeLabel}>OUI</span>
          </div>
        )}
      </div>

      {/* ── Binary prob display ── */}
      {!isMulti && (() => {
        const { bid, ask } = getBidAsk(pctYes / 100);
        return (
        <>
          <div style={S.probDisplay}>
            <span style={S.bigProb}>{pctYes}%</span>
            <div style={S.probInfo}>
              <span style={S.probSubtitle}>de chance que OUI</span>
              <span style={S.bidAskRow}>
                <span style={{ color: "#22c55e" }}>Achat {ask.toFixed(2)} pts</span>
                <span style={{ color: "#8888a0", margin: "0 4px" }}>·</span>
                <span style={{ color: "#ef4444" }}>Vente {bid.toFixed(2)} pts</span>
              </span>
            </div>
          </div>

          <div style={S.barWrap}>
            <div style={{ width: `${pctYes}%`, height: "100%", background: "#22c55e" }} />
            <div style={{ flex: 1, height: "100%", background: "#ef4444" }} />
          </div>
          <div style={S.barLabels}>
            <span style={{ color: "#22c55e", fontWeight: "500" }}>OUI · {pctYes}%</span>
            <span style={{ color: "#ef4444", fontWeight: "500" }}>NON · {pctNo}%</span>
          </div>

          {/* Stats */}
          <div style={S.statsRow}>
            <div style={S.statCard}>
              <span style={S.statValue}>{market.totalBets ?? 0}</span>
              <span style={S.statLabel}>Paris</span>
            </div>
            <div style={S.statCard}>
              <span style={S.statValue}>{Math.round(total)} pts</span>
              <span style={S.statLabel}>Volume</span>
            </div>
            <div style={S.statCard}>
              <span style={S.statValue}>{market.resolutionDate ?? "—"}</span>
              <span style={S.statLabel}>Résolution</span>
            </div>
          </div>

          {/* Chart */}
          {priceHistory.length > 1 && (
            <div style={S.chartWrap}>
              <p style={S.chartLabel}>Évolution des cotes</p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={priceHistory}>
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b6b8a" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b6b8a" }} unit="%" />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Oui"]}
                    contentStyle={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "8px", color: "#e8e8f0", fontSize: "13px" }}
                  />
                  <Line type="monotone" dataKey="oui" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
        );
      })()}

      {/* ── Multi options ── */}
      {isMulti && options.length > 0 && (() => {
        const numOptions = options.length;
        const sorted = [...options].sort((a, b) => (b.price ?? 1 / numOptions) - (a.price ?? 1 / numOptions));
        const leader = sorted[0];
        const leaderPct = Math.round((leader.price ?? 1 / numOptions) * 100);
        const totalVolume = options.reduce((acc, o) => acc + (o.q || 0), 0);
        const totalBetsMulti = market.totalBets ?? 0;
        const { bid: leaderBid, ask: leaderAsk } = getBidAsk(leader.price ?? 1 / numOptions);

        return (
          <>
            {/* Leader block — même style que le bigProb binaire */}
            <div style={S.probDisplay}>
              <span style={S.bigProb}>{leaderPct}%</span>
              <div style={S.probInfo}>
                <span style={{ fontSize: "15px", fontWeight: "600", color: "#e8e8f0" }}>{leader.label}</span>
                <span style={S.probSubtitle}>favori actuel</span>
                <span style={S.bidAskRow}>
                  <span style={{ color: "#22c55e" }}>Achat {leaderAsk.toFixed(2)} pts</span>
                  <span style={{ color: "#8888a0", margin: "0 4px" }}>·</span>
                  <span style={{ color: "#ef4444" }}>Vente {leaderBid.toFixed(2)} pts</span>
                </span>
              </div>
            </div>

            {/* Options list */}
            <div style={{ marginBottom: "20px" }}>
              {options.map((opt, i) => {
                const pct = Math.round((opt.price ?? 1 / numOptions) * 100);
                const color = MULTI_COLORS[i % MULTI_COLORS.length];
                return (
                  <div key={opt.id} style={S.multiOption}>
                    <div style={S.multiOptRow}>
                      <span style={{ color: "#e8e8f0" }}>{opt.label}</span>
                      <span style={{ color, fontWeight: "600" }}>{pct}%</span>
                    </div>
                    <div style={{ background: "rgba(124,58,237,0.1)", borderRadius: "99px", height: "5px" }}>
                      <div style={{ width: `${pct}%`, background: color, borderRadius: "99px", height: "5px" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats row */}
            <div style={S.statsRow}>
              <div style={S.statCard}>
                <span style={S.statValue}>{totalBetsMulti}</span>
                <span style={S.statLabel}>Paris</span>
              </div>
              <div style={S.statCard}>
                <span style={S.statValue}>{Math.round(totalVolume)} pts</span>
                <span style={S.statLabel}>Volume</span>
              </div>
              <div style={S.statCard}>
                <span style={S.statValue}>{market.resolutionDate ?? "—"}</span>
                <span style={S.statLabel}>Résolution</span>
              </div>
            </div>

            {/* Chart */}
            {multiHistory.length > 1 && (
              <div style={S.chartWrap}>
                <p style={S.chartLabel}>Évolution des cotes</p>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={multiHistory}>
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b6b8a" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b6b8a" }} unit="%" />
                    <Tooltip contentStyle={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "8px", color: "#e8e8f0", fontSize: "13px" }} />
                    {options.map((opt, i) => (
                      <Line key={opt.id} type="monotone" dataKey={opt.id} name={opt.label}
                        stroke={MULTI_COLORS[i % MULTI_COLORS.length]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        );
      })()}

      {/* ── Footer ── */}
      {market.resolutionSource && (
        <p style={S.footer}>
          Source : <a href={market.resolutionSource} target="_blank" rel="noreferrer" style={S.footerLink}>{market.resolutionSource}</a>
        </p>
      )}
      {market.resolutionDate && (
        <p style={S.footer}>Résolution : {market.resolutionDate}</p>
      )}

        </div>

        <div style={S.sideCol} className="kassandre-market-sidecol">
          {/* ── Bet panel ── */}
          {market.status === "open" && user && (
            <div style={S.betPanel}>
              <p style={S.betTitle}>Trader</p>

              {/* Toggle achat / vente */}
              <div style={S.modeToggle}>
                <button onClick={() => setMode("buy")} style={S.modeBtn(mode === "buy", false)}>Acheter</button>
                <button onClick={() => setMode("sell")} style={S.modeBtn(mode === "sell", true)}>Vendre</button>
              </div>

              {/* Sélection côté / option */}
              {!isMulti && (
                <div style={S.sideButtons}>
                  <button onClick={() => setSide("yes")} style={side === "yes" ? S.btnYesActive : S.btnYesInactive}>OUI</button>
                  <button onClick={() => setSide("no")} style={side === "no" ? S.btnNoActive : S.btnNoInactive}>NON</button>
                </div>
              )}

              {isMulti && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                  {options.map((opt, i) => {
                    const pct = Math.round((opt.price ?? 1 / options.length) * 100);
                    const color = MULTI_COLORS[i % MULTI_COLORS.length];
                    const isActive = selectedOption === opt.id;
                    return (
                      <button key={opt.id} onClick={() => setSelectedOption(opt.id)} style={{
                        padding: "10px 12px", borderRadius: "10px", cursor: "pointer",
                        fontSize: "13px", fontWeight: "600", textAlign: "left",
                        border: isActive ? `0.5px solid ${color}55` : "0.5px solid rgba(124,58,237,0.2)",
                        background: isActive ? `${color}18` : "transparent",
                        color: isActive ? color : "#8888a0", transition: "all 0.15s",
                      }}>
                        {opt.label}
                        <span style={{ display: "block", fontSize: "11px", fontWeight: "400", marginTop: "2px", opacity: 0.75 }}>{pct}%</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Position actuelle si elle existe */}
              {(() => {
                const posKey = isMulti ? selectedOption : side;
                const heldShares = positions[posKey] || 0;
                if (heldShares <= 0) return null;
                return (
                  <div style={S.positionBox}>
                    <p style={S.positionLabel}>Ta position</p>
                    <p style={{ fontSize: "15px", fontWeight: "600", color: "#e8e8f0" }}>
                      {heldShares.toFixed(2)} parts {!isMulti ? (side === "yes" ? "OUI" : "NON") : ""}
                    </p>
                  </div>
                );
              })()}

              {/* MODE ACHAT */}
              {mode === "buy" && (
                <>
                  <input
                    type="number" min="1" max={user.balance} value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="Mise en points"
                    style={S.amountInput}
                  />
                  {preview && (
                    <div style={S.previewBox}>
                      <div style={S.previewRow}>
                        <span style={S.previewLabel}>Parts reçues</span>
                        <span style={S.previewValue}>{preview.shares.toFixed(2)}</span>
                      </div>
                      <div style={S.previewRow}>
                        <span style={S.previewLabel}>Prix par part</span>
                        <span style={S.previewValue}>{preview.pricePerShare.toFixed(2)} pts</span>
                      </div>
                    </div>
                  )}
                  <button onClick={handleBet} disabled={loading} style={loading ? S.betCtaDisabled : S.betCta}>
                    {loading ? "En cours..." : `Acheter ${amount} pts`}
                  </button>
                </>
              )}

              {/* MODE VENTE */}
              {mode === "sell" && (() => {
                const posKey = isMulti ? selectedOption : side;
                const heldShares = positions[posKey] || 0;
                return (
                  <>
                    {heldShares > 0 ? (
                      <>
                        <input
                          type="number" min="0.01" step="0.01" max={heldShares}
                          value={sellAmount}
                          onChange={(e) => setSellAmount(Number(e.target.value))}
                          placeholder={`Max ${heldShares.toFixed(2)} parts`}
                          style={S.amountInput}
                        />
                        {sellPreview && (
                          <div style={S.previewBox}>
                            <div style={S.previewRow}>
                              <span style={S.previewLabel}>Tu récupères</span>
                              <span style={{ ...S.previewValue, color: "#22c55e" }}>{sellPreview.proceeds.toFixed(2)} pts</span>
                            </div>
                            <div style={S.previewRow}>
                              <span style={S.previewLabel}>Prix par part</span>
                              <span style={S.previewValue}>{sellPreview.pricePerShare.toFixed(2)} pts</span>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={handleSell}
                          disabled={loading || sellAmount <= 0 || sellAmount > heldShares}
                          style={{
                            ...S.betCta,
                            background: loading || sellAmount <= 0 || sellAmount > heldShares ? "#3a2066" : "rgba(239,68,68,0.8)",
                            cursor: loading || sellAmount <= 0 || sellAmount > heldShares ? "not-allowed" : "pointer",
                          }}
                        >
                          {loading ? "En cours..." : `Vendre ${sellAmount > 0 ? sellAmount.toFixed(2) : ""} parts`}
                        </button>
                      </>
                    ) : (
                      <p style={{ fontSize: "13px", color: "#8888a0", textAlign: "center", padding: "12px 0" }}>
                        Tu n'as aucune position {!isMulti ? (side === "yes" ? "OUI" : "NON") : ""} à vendre.
                      </p>
                    )}
                  </>
                );
              })()}

              {success && (
                <>
                  <div style={{ ...S.successMsg, marginTop: "12px" }}>
                    {mode === "sell" ? "Vente effectuée ✓" : "Pari placé avec succès ✓"}
                  </div>
                  {mode === "buy" && (
                    <button onClick={shareOnTwitter} style={S.shareBtn}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      Partager sur X
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {!user && (
            <div style={S.notLoggedIn}>
              Connecte-toi pour parier.
            </div>
          )}
        </div>
      </div>
    </>
  );
}