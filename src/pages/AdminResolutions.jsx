import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { resolveMarket } from "../lib/amm.js";
import { notify, askConfirm } from "../lib/notify";

// Date du jour à Paris au format AAAA-MM-JJ (même convention que les dates de résolution).
function todayParis() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

const S = {
  page: { maxWidth: "720px", margin: "24px auto", padding: "0 16px" },
  title: { fontSize: "22px", color: "#e8e8f0", margin: "0 0 6px" },
  sub: { fontSize: "13px", color: "#8888a0", margin: "0 0 18px", lineHeight: 1.5 },
  tabs: { display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" },
  tab: (on) => ({
    padding: "9px 16px", borderRadius: "999px", cursor: "pointer", fontWeight: 600, fontSize: "13px",
    border: on ? "1px solid rgba(167,139,250,0.7)" : "1px solid rgba(124,58,237,0.25)",
    background: on ? "rgba(124,58,237,0.35)" : "#15151f", color: on ? "#fff" : "#a8a8b8",
  }),
  search: {
    width: "100%", boxSizing: "border-box", padding: "11px 14px", marginBottom: "14px", borderRadius: "10px",
    border: "1px solid #2a2a3e", background: "#12121a", color: "#e8e8f0", fontSize: "14px",
  },
  card: (late) => ({
    border: late ? "1px solid rgba(245,158,11,0.45)" : "1px solid #2a2a3e",
    background: "#12121a", borderRadius: "12px", padding: "14px", marginBottom: "12px",
  }),
  q: { color: "#e8e8f0", fontSize: "15px", fontWeight: 600, lineHeight: 1.4, margin: "0 0 8px" },
  meta: { display: "flex", flexWrap: "wrap", gap: "6px 12px", fontSize: "12px", color: "#8888a0", marginBottom: "10px" },
  late: { color: "#f59e0b", fontWeight: 600 },
  src: { fontSize: "12px", color: "#a78bfa", wordBreak: "break-all", display: "block", marginBottom: "10px" },
  btnRow: { display: "flex", flexWrap: "wrap", gap: "8px" },
  btn: (bg) => ({
    flex: "1 1 120px", padding: "13px 12px", background: bg, color: "#fff", border: "none",
    borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontSize: "14px",
  }),
  empty: { padding: "30px 10px", textAlign: "center", color: "#8888a0", fontSize: "14px" },
};

function MultiButtons({ market, onResolve }) {
  const [options, setOptions] = useState(null);
  useEffect(() => {
    let alive = true;
    getDocs(collection(db, "markets", market.id, "options")).then((snap) => {
      if (alive) setOptions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { alive = false; };
  }, [market.id]);
  if (!options) return <p style={{ fontSize: "12px", color: "#8888a0" }}>Chargement des options…</p>;
  return (
    <div style={S.btnRow}>
      {options.map((o) => (
        <button key={o.id} style={S.btn("#7c3aed")} onClick={() => onResolve(market, o.id, o.label)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function AdminResolutions() {
  const { user } = useAuth();
  const [markets, setMarkets] = useState([]);
  const [tab, setTab] = useState("due");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!user?.isAdmin) return undefined;
    const q = query(collection(db, "markets"), where("status", "==", "open"));
    return onSnapshot(q, (snap) => setMarkets(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const today = todayParis();
  const sorted = useMemo(
    () => [...markets].sort((a, b) => String(a.resolutionDate || "9999").localeCompare(String(b.resolutionDate || "9999"))),
    [markets]
  );
  const dueCount = sorted.filter((m) => m.resolutionDate && m.resolutionDate <= today).length;

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sorted.filter((m) => {
      if (tab === "due" && !(m.resolutionDate && m.resolutionDate <= today)) return false;
      if (term && !String(m.question || "").toLowerCase().includes(term)) return false;
      return true;
    });
  }, [sorted, tab, search, today]);

  async function handleResolve(market, outcome, label) {
    const ok = await askConfirm(
      `Résoudre « ${market.question} » avec : ${label} ? Les gains seront distribués et l'action est irréversible.`,
      { confirmLabel: "Résoudre", danger: true }
    );
    if (!ok) return;
    setBusyId(market.id);
    try {
      await resolveMarket(market.id, outcome);
      notify("Marché résolu et gains distribués.", "success");
    } catch (e) {
      notify(e.message || "Erreur lors de la résolution.", "error");
    }
    setBusyId(null);
  }

  if (!user) return <p style={{ padding: "40px", color: "#8888a0" }}>Connecte-toi pour continuer.</p>;
  if (!user.isAdmin) return <p style={{ padding: "40px", color: "#8888a0" }}>Page introuvable.</p>;

  return (
    <div style={S.page}>
      <h1 style={S.title}>Résolutions</h1>
      <p style={S.sub}>
        Marchés ouverts à résoudre. Vérifie la source avant de valider : la résolution distribue les gains et ne peut pas être annulée.{" "}
        <Link to="/admin" style={{ color: "#a78bfa" }}>Retour à l'admin</Link>
      </p>

      <div style={S.tabs}>
        <button style={S.tab(tab === "due")} onClick={() => setTab("due")}>À résoudre ({dueCount})</button>
        <button style={S.tab(tab === "all")} onClick={() => setTab("all")}>Tous les ouverts ({sorted.length})</button>
      </div>

      <input style={S.search} placeholder="Rechercher un marché…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {shown.length === 0 && (
        <p style={S.empty}>{tab === "due" ? "Aucun marché n'a atteint sa date de résolution." : "Aucun marché trouvé."}</p>
      )}

      {shown.map((m) => {
        const isLate = m.resolutionDate && m.resolutionDate <= today;
        const isMulti = m.type === "multi";
        const hasBets = (m.totalVolume || 0) > 0 || (m.betCount || 0) > 0;
        return (
          <div key={m.id} style={S.card(isLate)}>
            <p style={S.q}>{m.question}</p>
            <div style={S.meta}>
              <span style={isLate ? S.late : undefined}>{isLate ? "Échéance dépassée : " : "Résolution : "}{m.resolutionDate || "non définie"}</span>
              <span>{isMulti ? "Multi-choix" : "Oui/Non"}</span>
              <span>{hasBets ? "Paris en cours" : "Aucun pari"}</span>
              <Link to={`/market/${m.id}`} style={{ color: "#a78bfa" }}>Voir le marché</Link>
            </div>
            {m.resolutionSource && (
              /^https?:\/\//.test(m.resolutionSource)
                ? <a href={m.resolutionSource} target="_blank" rel="noreferrer" style={S.src}>Source : {m.resolutionSource}</a>
                : <span style={{ ...S.src, color: "#a8a8b8" }}>Source : {m.resolutionSource}</span>
            )}
            {busyId === m.id ? (
              <p style={{ fontSize: "13px", color: "#a78bfa" }}>Résolution en cours…</p>
            ) : isMulti ? (
              <MultiButtons market={m} onResolve={handleResolve} />
            ) : (
              <div style={S.btnRow}>
                <button style={S.btn("#16a34a")} onClick={() => handleResolve(m, "yes", "OUI")}>Résoudre : Oui</button>
                <button style={S.btn("#dc2626")} onClick={() => handleResolve(m, "no", "NON")}>Résoudre : Non</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
