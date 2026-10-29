import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

// Les plus fortes variations des dernières 24 h, calculées toutes les heures
// par une Cloud Function (document public meta/movers).
export default function MoversSection() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    getDoc(doc(db, "meta", "movers"))
      .then((snap) => {
        if (!alive || !snap.exists()) return;
        const d = snap.data();
        const ageMs = d.updatedAt?.toMillis ? Date.now() - d.updatedAt.toMillis() : 0;
        // Données trop anciennes (fonction arrêtée) : on ne montre rien plutôt que du faux
        if (ageMs < 36 * 3600 * 1000) setItems(d.items || []);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (items.length === 0) return null;

  return (
    <section style={{ marginBottom: "28px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--k-text)", margin: "0 0 12px" }}>
        Marchés qui bougent
        <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--k-muted)", marginLeft: "8px" }}>sur 24 heures</span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
        {items.map((m) => {
          const up = m.to > m.from;
          const color = up ? "#22c55e" : "#ef4444";
          return (
            <Link key={m.marketId} to={`/market/${m.marketId}`}
              style={{ textDecoration: "none", background: "var(--k-inset)", border: "0.5px solid rgba(var(--k-accent-rgb),0.2)", borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ color: "var(--k-text)", fontSize: "13px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {m.question}
              </span>
              <span style={{ fontSize: "13px", color: "var(--k-muted)" }}>
                {m.label} <span style={{ color, fontWeight: 700 }}>{up ? "▲" : "▼"} {m.from}% → {m.to}%</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
