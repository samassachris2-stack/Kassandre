import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

const STATUS = { open: "Ouvert", resolved: "Résolu", closed: "Clos" };

// Carte « probabilité en direct » destinée à être intégrée en iframe sur un site tiers.
export default function EmbedMarket() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const light = params.get("theme") === "light";
  const [market, setMarket] = useState(null);
  const [options, setOptions] = useState([]);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    // Ne pas indexer les pages d'intégration (la page marché reste la référence)
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    return onSnapshot(doc(db, "markets", id),
      (snap) => { setMissing(!snap.exists()); setMarket(snap.exists() ? snap.data() : null); },
      () => setMissing(true));
  }, [id]);

  const isMulti = market?.type === "multi";
  useEffect(() => {
    if (!isMulti) return;
    return onSnapshot(collection(db, "markets", id, "options"),
      (snap) => setOptions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {});
  }, [id, isMulti]);

  const c = light
    ? { bg: "#ffffff", fg: "#14141c", mute: "#6b6b80", border: "#e2e2ec", track: "#ececf4" }
    : { bg: "#0f0f17", fg: "#e8e8f0", mute: "#8888a0", border: "rgba(124,58,237,0.3)", track: "#1d1d2b" };

  const link = `https://kassandre.app/market/${id}`;
  const wrap = { boxSizing: "border-box", minHeight: "100vh", padding: "14px 16px", background: c.bg, color: c.fg, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", border: `1px solid ${c.border}`, borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" };

  if (missing) return <div style={wrap}><p style={{ margin: 0, fontSize: "14px" }}>Marché introuvable.</p></div>;
  if (!market) return <div style={wrap} />;

  let rows;
  if (isMulti) {
    const n = options.length || 1;
    rows = [...options]
      .sort((a, b) => (b.price ?? 1 / n) - (a.price ?? 1 / n))
      .slice(0, 3)
      .map((o) => ({ label: o.label, pct: Math.round((o.price ?? 1 / n) * 100) }));
  } else {
    const total = (market.poolYes || 0) + (market.poolNo || 0);
    rows = [{ label: "Oui", pct: total > 0 ? Math.round((market.poolNo / total) * 100) : 50 }];
  }

  return (
    <div style={wrap}>
      <a href={link} target="_blank" rel="noopener" style={{ color: c.fg, textDecoration: "none", fontSize: "15px", fontWeight: 600, lineHeight: 1.35 }}>
        {market.question}
      </a>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
            <span style={{ color: c.mute }}>{r.label}</span>
            <span style={{ fontWeight: 700, color: "#7c3aed" }}>{r.pct}%</span>
          </div>
          <div style={{ height: "8px", borderRadius: "4px", background: c.track, overflow: "hidden" }}>
            <div style={{ width: `${r.pct}%`, height: "100%", background: "#7c3aed" }} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: c.mute }}>
        <span>{STATUS[market.status] || ""}</span>
        <a href={link} target="_blank" rel="noopener" style={{ color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>
          Kassandre, marché de prédiction
        </a>
      </div>
    </div>
  );
}
