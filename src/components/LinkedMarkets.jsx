import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

export const MAX_LINKED_MARKETS = 3;

const MULTI_COLORS = ["#7c3aed", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4"];

// Cartes des marchés liés à un article : question, probabilités en direct,
// date de résolution et bouton pour parier. Trois au maximum.
export default function LinkedMarkets({ ids }) {
  const [items, setItems] = useState(null);
  const wanted = (ids || []).slice(0, MAX_LINKED_MARKETS);
  const key = wanted.join("|");

  useEffect(() => {
    let alive = true;
    const list = key ? key.split("|") : [];
    Promise.all(
      list.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, "markets", id));
          if (!snap.exists()) return null;
          const m = { id: snap.id, ...snap.data() };
          if (m.type === "multi") {
            const os = await getDocs(collection(db, "markets", id, "options"));
            m.options = os.docs.map((d) => ({ id: d.id, ...d.data() }));
          }
          return m;
        } catch {
          return null;
        }
      })
    ).then((res) => {
      if (alive) setItems(res.filter(Boolean));
    });
    return () => { alive = false; };
  }, [key]);

  if (!items || items.length === 0) return null;

  return (
    <section style={{ borderTop: "1px solid #2a2a35", paddingTop: "22px", marginTop: "8px" }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#e8e8f0", margin: "0 0 12px" }}>
        Donnez votre pronostic
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((m) => <Card key={m.id} market={m} />)}
      </div>
    </section>
  );
}

function Card({ market }) {
  const isMulti = market.type === "multi";
  const open = market.status === "open";
  const cats = Array.isArray(market.categories) ? market.categories : (market.category ? [market.category] : []);

  let stat;
  if (isMulti) {
    const opts = [...(market.options || [])]
      .map((o, i) => ({ ...o, color: MULTI_COLORS[i % MULTI_COLORS.length] }))
      .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
      .slice(0, 2);
    stat = (
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>
        {opts.map((o) => {
          const pct = Math.round((o.price ?? 0) * 100);
          return (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#c8c8d8" }}>
              <span style={{ flex: "0 0 38%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
              <div style={{ flex: 1 }}><Bar pct={pct} color={o.color} /></div>
              <span style={{ width: "34px", textAlign: "right", fontWeight: 700, color: o.color }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    );
  } else {
    const total = (market.poolYes || 0) + (market.poolNo || 0);
    const yes = total > 0 ? Math.round(((market.poolNo || 0) / total) * 100) : 50;
    stat = (
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "12px", color: "#8888a0" }}>OUI</span>
        <div style={{ flex: 1 }}><Bar pct={yes} color="#22c55e" track="rgba(239,68,68,0.55)" /></div>
        <span style={{ fontSize: "15px", fontWeight: 800, color: "#22c55e", minWidth: "38px", textAlign: "right" }}>{yes}%</span>
      </div>
    );
  }

  return (
    <Link
      to={`/market/${market.id}`}
      style={{
        textDecoration: "none", display: "block", borderRadius: "10px",
        border: "0.5px solid rgba(124,58,237,0.3)", background: "#0f0f17", padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
        <span style={{
          fontSize: "14px", fontWeight: 600, color: "#f3f4f6", lineHeight: 1.35,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {market.question}
        </span>
        <span style={{ flexShrink: 0, fontSize: "12px", fontWeight: 700, color: "#fff", background: "#7c3aed", borderRadius: "6px", padding: "5px 10px" }}>
          {open ? "Parier" : "Voir"}
        </span>
      </div>
      {stat}
      <div style={{ fontSize: "11px", color: "#8888a0", marginTop: "8px" }}>
        {cats[0] ? `${cats[0]} · ` : ""}
        {!open ? (market.status === "resolved" ? "Résolu" : "Fermé") : market.resolutionDate ? `Résolution ${market.resolutionDate}` : ""}
      </div>
    </Link>
  );
}

function Bar({ pct, color, track = "#1d1d2b" }) {
  return (
    <div style={{ height: "6px", borderRadius: "3px", background: track, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(2, Math.min(100, pct))}%`, height: "100%", background: color }} />
    </div>
  );
}
