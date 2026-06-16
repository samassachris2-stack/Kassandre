import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { placeBet, calcShares, getPrice } from "../lib/amm";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Market() {
  const { id } = useParams();
  const { user } = useAuth();
  const [market, setMarket] = useState(null);
  const [side, setSide] = useState("yes");
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
      const total = data.poolYes + data.poolNo;
      const pct = Math.round((data.poolNo / total) * 100);
      setPriceHistory((prev) => [
        ...prev.slice(-29),
        { time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), oui: pct }
      ]);
    }
  });
  return unsubscribe;
}, [id]);

useEffect(() => {
  if (!market || amount <= 0) return;
  try {
    const result = calcShares(market.poolYes, market.poolNo, side, amount);
    setPreview(result);
  } catch {
    setPreview(null);
  }
}, [market, side, amount]);

  async function handleBet() {
    if (!user || !market || amount <= 0) return;
    setLoading(true);
    try {
      await placeBet(user.uid, id, side, amount);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  }

  if (!market) return <p style={{ padding: "40px" }}>Chargement...</p>;

  const total = market.poolYes + market.poolNo;
  const pctYes = Math.round((market.poolNo / total) * 100);
  const pctNo = 100 - pctYes;

  function shareOnTwitter() {
  const total = market.poolYes + market.poolNo;
  const pctYes = Math.round((market.poolNo / total) * 100);
  const pctNo = 100 - pctYes;
  const sideLabel = side === "yes" ? "OUI" : "NON";
  const sidePct = side === "yes" ? pctYes : pctNo;

  const text = `Je parie ${sideLabel} (${sidePct}%) sur :\n\n"${market.question}"\n\nTu penses quoi ? 👁 kassandre.app`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

  return (
    <div style={{ maxWidth: "660px", margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "24px" }}>{market.question}</h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <div style={{ flex: pctYes, background: "#22c55e", borderRadius: "4px", height: "10px" }}/>
        <div style={{ flex: pctNo, background: "#ef4444", borderRadius: "4px", height: "10px" }}/>
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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px", fontSize: "14px" }}>
        <span style={{ color: "#22c55e", fontWeight: "600" }}>Oui {pctYes}%</span>
        <span style={{ color: "#ef4444", fontWeight: "600" }}>Non {pctNo}%</span>
      </div>

      {market.status === "open" && user && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "16px" }}>Placer un pari</h2>

          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button
              onClick={() => setSide("yes")}
              style={{
                flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                background: side === "yes" ? "#22c55e" : "#f3f4f6",
                color: side === "yes" ? "#fff" : "#000",
                fontWeight: "600", cursor: "pointer"
              }}
            >
              Oui
            </button>
            <button
              onClick={() => setSide("no")}
              style={{
                flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                background: side === "no" ? "#ef4444" : "#f3f4f6",
                color: side === "no" ? "#fff" : "#000",
                fontWeight: "600", cursor: "pointer"
              }}
            >
              Non
            </button>
          </div>

          <input
            type="number"
            min="1"
            max={user.balance}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "12px", boxSizing: "border-box" }}
          />

          {preview && (
            <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Parts reçues</span>
                <span style={{ fontWeight: "600" }}>{preview.shares.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Prix par part</span>
                <span style={{ fontWeight: "600" }}>{(preview.pricePerShare * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}

          <button
            onClick={handleBet}
            disabled={loading}
            style={{
              width: "100%", padding: "12px", background: "#000", color: "#fff",
              borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600"
            }}
          >
            {loading ? "En cours..." : `Parier ${amount} pts sur ${side === "yes" ? "Oui" : "Non"}`}
          </button>

          {success && <p style={{ color: "green", marginTop: "8px" }}>Pari placé avec succès.</p>}
        </div>
      )}

      {success && (
  <div>
    <p style={{ color: "#7c3aed", marginBottom: "12px" }}>Pari placé avec succès.</p>
    <button
      onClick={shareOnTwitter}
      style={{
        width: "100%", padding: "10px", background: "#000", color: "#fff",
        borderRadius: "8px", border: "none", cursor: "pointer",
        fontWeight: "600", display: "flex", alignItems: "center",
        justifyContent: "center", gap: "8px", fontSize: "14px"
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      Partager sur X
    </button>
  </div>
)}

      {!user && (
        <p style={{ color: "#888" }}>Connecte toi pour parier.</p>
      )}

      <p style={{ marginTop: "24px", fontSize: "13px", color: "#aaa" }}>
        Source : <a href={market.resolutionSource} target="_blank">{market.resolutionSource}</a>
      </p>
      <p style={{ fontSize: "13px", color: "#aaa" }}>Résolution : {market.resolutionDate}</p>
    </div>
  );
}