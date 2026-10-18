import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

function describe(n) {
  const q = n.question || "Un marché que vous suivez";
  if (n.type === "move") {
    const dir = n.to > n.from ? "monte" : "baisse";
    return `${q} : ${n.label} ${dir} de ${Math.round(n.from)}% à ${Math.round(n.to)}%`;
  }
  if (n.type === "resolved") {
    const res = n.outcomeLabel ? ` Résultat : ${n.outcomeLabel}.` : "";
    return `${q} est résolu.${res} Vous gagnez ${Math.round(n.payout || 0)} pts.`;
  }
  if (n.type === "resolved_followed") {
    const res = n.outcomeLabel ? ` Résultat : ${n.outcomeLabel}.` : "";
    return `${q} est résolu.${res}`;
  }
  if (n.type === "referral") return `Un filleul vient de s'inscrire avec votre lien : +${n.bonus} points.`;
  return q;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!uid) return;
    // Un seul filtre, tri côté client : évite un index composite à créer.
    const q = query(collection(db, "notifications"), where("userId", "==", uid));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(list.slice(0, 20));
    }, () => {});
  }, [uid]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!uid) return null;
  const unread = items.filter((n) => !n.read);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) unread.forEach((n) => updateDoc(doc(db, "notifications", n.id), { read: true }).catch(() => {}));
  }

  return (
    <div ref={box} style={{ position: "relative" }}>
      <button onClick={toggle} aria-label="Notifications" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#a8a8b8", padding: "4px", position: "relative", display: "flex" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread.length > 0 && (
          <span style={{ position: "absolute", top: "-2px", right: "-2px", background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: 700, borderRadius: "10px", minWidth: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
            {unread.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <style>{`
            .kassandre-notif-panel {
              position: absolute; right: 0; top: 36px;
              width: min(340px, 90vw); max-height: 420px; overflow-y: auto;
              background: #0f0f17; border: 0.5px solid rgba(124,58,237,0.3);
              border-radius: 10px; z-index: 60; box-shadow: 0 8px 30px rgba(0,0,0,0.5);
            }
            .kassandre-notif-head { display: none; }
            /* Sur téléphone : panneau pleine largeur sous la navbar, avec un bouton de fermeture */
            @media (max-width: 720px) {
              .kassandre-notif-panel {
                position: fixed; top: 68px; left: 8px; right: 8px; width: auto;
                max-height: calc(100vh - 84px); border-radius: 12px;
              }
              .kassandre-notif-head { display: flex; }
            }
          `}</style>
          <div className="kassandre-notif-panel" role="dialog" aria-label="Notifications">
            <div className="kassandre-notif-head" style={{
              alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0,
              padding: "12px 14px", background: "#0f0f17", borderBottom: "0.5px solid rgba(124,58,237,0.2)",
            }}>
              <span style={{ fontSize: "15px", fontWeight: 600, color: "#e8e8f0" }}>Notifications</span>
              <button type="button" onClick={toggle} aria-label="Fermer" style={{
                background: "transparent", border: "none", color: "#8888a0", fontSize: "24px",
                lineHeight: 1, cursor: "pointer", padding: "0 6px",
              }}>×</button>
            </div>
            {items.length === 0 ? (
              <p style={{ color: "#8888a0", fontSize: "14px", padding: "18px 16px", margin: 0, lineHeight: 1.5 }}>
                Aucune alerte. Suivez un marché avec le bouton Suivre pour être prévenu.
              </p>
            ) : items.map((n) => (
              <Link key={n.id} to={n.marketId ? `/market/${n.marketId}` : "/settings"} onClick={toggle}
                style={{ display: "block", padding: "14px 16px", textDecoration: "none", color: "#e8e8f0", fontSize: "14px", lineHeight: 1.5, borderBottom: "0.5px solid rgba(124,58,237,0.12)", background: n.read ? "transparent" : "rgba(124,58,237,0.08)" }}>
                {describe(n)}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
