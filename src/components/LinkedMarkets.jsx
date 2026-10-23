import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cssUrl } from "../lib/cssUrl";

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
    <section style={{ borderTop: "1px solid #2a2a35", paddingTop: "28px", marginTop: "8px" }}>
      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#e8e8f0", margin: "0 0 4px" }}>
        Donnez votre pronostic
      </h3>
      <p style={{ fontSize: "13px", color: "#8888a0", margin: "0 0 16px" }}>
        Les marchés liés à cet article, en points virtuels.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {items.map((m) => <Card key={m.id} market={m} />)}
      </div>
    </section>
  );
}

function Card({ market }) {
  const isMulti = market.type === "multi";
  const open = market.status === "open";
  const cats = Array.isArray(market.categories) ? market.categories : (market.category ? [market.category] : []);
  const volume = Math.round(market.totalVolume || 0);

  let body;
  if (isMulti) {
    const opts = [...(market.options || [])]
      .map((o, i) => ({ ...o, color: MULTI_COLORS[i % MULTI_COLORS.length] }))
      .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
      .slice(0, 3);
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {opts.map((o) => {
          const pct = Math.round((o.price ?? 0) * 100);
          return (
            <div key={o.id}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#e8e8f0", marginBottom: "3px" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "8px" }}>{o.label}</span>
                <span style={{ fontWeight: 700, color: o.color }}>{pct}%</span>
              </div>
              <Bar pct={pct} color={o.color} />
            </div>
          );
        })}
        {(market.options || []).length > 3 && (
          <span style={{ fontSize: "12px", color: "#8888a0" }}>+ {(market.options || []).length - 3} autres options</span>
        )}
      </div>
    );
  } else {
    const total = (market.poolYes || 0) + (market.poolNo || 0);
    const yes = total > 0 ? Math.round(((market.poolNo || 0) / total) * 100) : 50;
    body = (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
          <span style={{ fontSize: "13px", color: "#8888a0" }}>Probabilité du OUI</span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#22c55e", lineHeight: 1 }}>{yes}%</span>
        </div>
        <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", background: "rgba(239,68,68,0.55)" }}>
          <div style={{ width: `${Math.max(2, Math.min(98, yes))}%`, background: "#22c55e" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#8888a0", marginTop: "4px" }}>
          <span>OUI</span><span>NON</span>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/market/${market.id}`}
      style={{
        textDecoration: "none", display: "block", borderRadius: "14px", overflow: "hidden",
        border: "0.5px solid rgba(124,58,237,0.35)",
        background: market.coverImageUrl
          ? `linear-gradient(160deg, rgba(10,10,15,0.82), rgba(10,10,15,0.95)), ${cssUrl(market.coverImageUrl)} center / cover no-repeat`
          : "linear-gradient(160deg, #15122a, #0a0a0f)",
        padding: "18px",
      }}
    >
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px", alignItems: "center" }}>
        {cats.slice(0, 2).map((c) => (
          <span key={c} style={{ fontSize: "11px", fontWeight: 600, color: "#a78bfa", background: "rgba(124,58,237,0.16)", borderRadius: "6px", padding: "2px 8px" }}>{c}</span>
        ))}
        {!open && (
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#f59e0b", background: "rgba(245,158,11,0.14)", borderRadius: "6px", padding: "2px 8px" }}>
            {market.status === "resolved" ? "Résolu" : "Fermé"}
          </span>
        )}
      </div>
      <div style={{ fontSize: "16px", fontWeight: 600, color: "#f3f4f6", lineHeight: 1.4, marginBottom: "14px" }}>
        {market.question}
      </div>
      {body}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", gap: "10px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", color: "#8888a0" }}>
          {market.resolutionDate ? `Résolution : ${market.resolutionDate}` : ""}
          {volume > 0 ? ` · ${volume.toLocaleString("fr-FR")} pts échangés` : ""}
        </span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff", background: "#7c3aed", borderRadius: "8px", padding: "8px 14px" }}>
          {open ? "Parier" : "Voir le marché"} →
        </span>
      </div>
    </Link>
  );
}

function Bar({ pct, color }) {
  return (
    <div style={{ height: "6px", borderRadius: "3px", background: "#1d1d2b", overflow: "hidden" }}>
      <div style={{ width: `${Math.max(2, Math.min(100, pct))}%`, height: "100%", background: color }} />
    </div>
  );
}
