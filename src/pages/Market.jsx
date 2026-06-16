import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { placeBet, calcShares, placeBetMulti, calcSharesMulti } from "../lib/amm.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Market() {
  const { id } = useParams();
  const { user } = useAuth();
  const [market, setMarket] = useState(null);
  const [options, setOptions] = useState([]);
  const [side, setSide] = useState("yes");
  const [selectedOption, setSelectedOption] = useState(null);
  const [amount, setAmount] = useState(10);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "markets", id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setMarket(data);
        if (data.type !== "multi") {
          const total = data.poolYes + data.poolNo;
          const pct = Math.round((data.poolNo / total) * 100);
          setPriceHistory((prev) => [
            ...prev.slice(-29),
            { time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), oui: pct }
          ]);
        }
      }
    });
    return unsubscribe;
  }, [id]);

useEffect(() => {
  console.log("market type:", market?.type);
  if (!market || market.type !== "multi") return;
  async function loadOptions() {
    console.log("chargement options pour", id);
    const snap = await getDocs(collection(db, "markets", id, "options"));
    console.log("options trouvées:", snap.docs.length);
    const opts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setOptions(opts);
    if (opts.length > 0) setSelectedOption(opts[0].id);
  }
  loadOptions();
}, [market]);

  useEffect(() => {
    if (!market || amount <= 0) return;
    try {
      if (market.type === "multi") {
        const opt = options.find((o) => o.id === selectedOption);
        if (!opt) return;
        const result = calcSharesMulti(opt.pool, opt.totalPool, amount);
        setPreview(result);
      } else {
        const result = calcShares(market.poolYes, market.poolNo, side, amount);
        setPreview(result);
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

  function shareOnTwitter() {
    const sideLabel = market.type === "multi"
      ? options.find((o) => o.id === selectedOption)?.label
      : side === "yes" ? "OUI" : "NON";
    const text = `Je parie sur "${sideLabel}" :\n\n"${market.question}"\n\nTu penses quoi ? 👁 kassandre.app`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  if (!market) return <p style={{ padding: "40px" }}>Chargement...</p>;

  const isMulti = market.type === "multi";
  const total = isMulti ? 0 : market.poolYes + market.poolNo;
  const pctYes = isMulti ? null : Math.round((market.poolNo / total) * 100);
  const pctNo = isMulti ? null : 100 - pctYes;

  return (
    <div style={{ maxWidth: "660px", margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "24px" }}>{market.question}</h1>

      {!isMulti && (
        <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <div style={{ flex: pctYes, background: "#22c55e", borderRadius: "4px", height: "10px" }}/>
            <div style={{ flex: pctNo, background: "#ef4444", borderRadius: "4px", height: "10px" }}/>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", fontSize: "14px" }}>
            <span style={{ color: "#22c55e", fontWeight: "600" }}>Oui {pctYes}%</span>
            <span style={{ color: "#ef4444", fontWeight: "600" }}>Non {pctNo}%</span>
          </div>
          {priceHistory.length > 1 && (
            <div style={{ marginBottom: "32px" }}>
              <p style={{ fontSize: "13px", color: "#6b6b8a", marginBottom: "12px" }}>Évolution des cotes</p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={priceHistory}>
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b6b8a" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b6b8a" }} unit="%" />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Oui"]}
                    contentStyle={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "8px", color: "#e8e8f0" }}
                  />
                  <Line type="monotone" dataKey="oui" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {isMulti && options.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          {options.map((opt) => {
            const pct = Math.round((opt.pool / opt.totalPool) * 100);
            return (
              <div key={opt.id} style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "600" }}>{opt.label}</span>
                  <span style={{ color: "#7c3aed" }}>{pct}%</span>
                </div>
                <div style={{ background: "#1a1a2e", borderRadius: "4px", height: "6px" }}>
                  <div style={{ width: `${pct}%`, background: "#7c3aed", borderRadius: "4px", height: "6px" }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {market.status === "open" && user && (
        <div style={{ border: "1px solid #2a2a3e", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "16px" }}>Placer un pari</h2>

          {!isMulti && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <button onClick={() => setSide("yes")} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: side === "yes" ? "#22c55e" : "#1a1a2e", color: side === "yes" ? "#fff" : "#e8e8f0", fontWeight: "600", cursor: "pointer" }}>Oui</button>
              <button onClick={() => setSide("no")} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: side === "no" ? "#ef4444" : "#1a1a2e", color: side === "no" ? "#fff" : "#e8e8f0", fontWeight: "600", cursor: "pointer" }}>Non</button>
            </div>
          )}

          {isMulti && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedOption(opt.id)}
                  style={{
                    padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
                    background: selectedOption === opt.id ? "#7c3aed" : "#1a1a2e",
                    color: "#e8e8f0", fontWeight: "600", fontSize: "14px"
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <input
            type="number" min="1" max={user.balance} value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0", marginBottom: "12px", boxSizing: "border-box" }}
          />

          {preview && (
            <div style={{ background: "#12121a", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b6b8a" }}>Parts reçues</span>
                <span style={{ fontWeight: "600" }}>{preview.shares.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b6b8a" }}>Prix par part</span>
                <span style={{ fontWeight: "600" }}>{(preview.pricePerShare * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}

          <button
            onClick={handleBet} disabled={loading}
            style={{ width: "100%", padding: "12px", background: "#7c3aed", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}
          >
            {loading ? "En cours..." : `Parier ${amount} pts`}
          </button>

          {success && (
            <div style={{ marginTop: "12px" }}>
              <p style={{ color: "#7c3aed", marginBottom: "12px" }}>Pari placé avec succès.</p>
              <button
                onClick={shareOnTwitter}
                style={{ width: "100%", padding: "10px", background: "#000", color: "#fff", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "14px" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Partager sur X
              </button>
            </div>
          )}
        </div>
      )}

      {!user && <p style={{ color: "#6b6b8a" }}>Connecte toi pour parier.</p>}

      <p style={{ marginTop: "24px", fontSize: "13px", color: "#4a4a5a" }}>
        Source : <a href={market.resolutionSource} target="_blank" style={{ color: "#7c3aed" }}>{market.resolutionSource}</a>
      </p>
      <p style={{ fontSize: "13px", color: "#4a4a5a" }}>Résolution : {market.resolutionDate}</p>
    </div>
  );
}