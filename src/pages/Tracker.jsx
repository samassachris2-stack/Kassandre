import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { useSEO } from "../hooks/useSEO";
import { loadForecastStats, MIN_SAMPLE } from "../lib/forecastStats";

const pct = (v, d = 0) => (v === null || v === undefined ? "n.d." : `${(v * 100).toFixed(d)} %`);
const signed = (v, unit = "") => {
  if (v === null || v === undefined) return "n.d.";
  const r = Math.round(v);
  return `${r > 0 ? "+" : ""}${r}${unit}`;
};
const signedPts = (v) => (v === null || v === undefined ? "n.d." : `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)} pts`);
const GREEN = "#22c55e";
const RED = "#ef4444";
const tone = (v) => (v === null || v === undefined || v === 0 ? "var(--k-text)" : v > 0 ? GREEN : RED);

export default function Tracker() {
  const { uid } = useParams();
  // Le key remet tout à zéro quand on passe d'un membre à un autre.
  return <TrackerView key={uid} uid={uid} />;
}

function TrackerView({ uid }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState("Chargement...");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [cat, setCat] = useState("");
  const [shown, setShown] = useState(15);
  const seo = useSEO({
    title: "Tracker de prévisions",
    description: "Taux de réussite, calibration et résultat des prévisions d'un membre de Kassandre.",
    url: `/tracker/${uid}`,
  });

  useEffect(() => {
    let alive = true;
    getDoc(doc(db, "users", uid)).then((s) => { if (alive && s.exists()) setProfile(s.data()); }).catch(() => {});
    loadForecastStats(uid, (m) => { if (alive) setProgress(m); })
      .then((r) => { if (alive) setStats(r); })
      .catch((e) => { console.error(e); if (alive) setError("Impossible de calculer le tracker pour le moment."); });
    return () => { alive = false; };
  }, [uid]);

  const name = profile?.pseudo || profile?.displayName || "Membre";
  const mine = user && user.uid === uid;

  const rows = useMemo(() => {
    if (!stats) return [];
    return stats.positions.filter((p) => {
      if (filter === "won" && !(p.won && !p.closedEarly)) return false;
      if (filter === "lost" && !(!p.won && !p.closedEarly)) return false;
      if (filter === "early" && !p.closedEarly) return false;
      if (cat && !p.categories.includes(cat)) return false;
      return true;
    });
  }, [stats, filter, cat]);

  return (
    <div style={{ maxWidth: "860px", margin: "32px auto", padding: "0 16px" }}>
      {seo}
      <Link to={`/profil/${uid}`} style={{ color: "var(--k-accent-text)", textDecoration: "none", fontSize: "14px" }}>← Profil</Link>
      <h1 style={{ fontSize: "26px", color: "var(--k-text)", margin: "10px 0 4px" }}>
        Tracker de prévisions{!mine ? ` de ${name}` : ""}
      </h1>
      <p style={{ color: "var(--k-muted)", fontSize: "14px", margin: "0 0 24px" }}>
        Ce que disent les paris sur la qualité des prévisions. Chiffres calculés sur les marchés résolus.
      </p>

      {error && <p style={{ color: RED }}>{error}</p>}
      {!stats && !error && <p style={{ color: "var(--k-muted)" }}>{progress}</p>}

      {stats && stats.resolvedCount === 0 && (
        <div style={card}>
          <p style={{ margin: 0, color: "var(--k-text)" }}>Aucun marché résolu pour le moment.</p>
          <p style={{ margin: "6px 0 0", color: "var(--k-muted)", fontSize: "14px" }}>
            {stats.openMarkets > 0
              ? `${stats.openMarkets} marché${stats.openMarkets > 1 ? "s" : ""} en cours : le tracker se remplira à leur résolution.`
              : "Place un premier pari pour commencer à te mesurer."}
          </p>
        </div>
      )}

      {stats && stats.resolvedCount > 0 && (
        <>
          {!stats.reliable && (
            <div style={{ ...card, borderColor: "#f59e0b", marginBottom: "16px" }}>
              <span style={{ color: "#f59e0b", fontWeight: 600 }}>Échantillon faible. </span>
              <span style={{ color: "var(--k-text2)", fontSize: "14px" }}>
                {stats.heldCount} position{stats.heldCount > 1 ? "s" : ""} analysée{stats.heldCount > 1 ? "s" : ""} : en dessous de {MIN_SAMPLE}, la chance pèse plus que le talent. Lis ces chiffres avec prudence.
              </span>
            </div>
          )}

          <div style={grid}>
            <Kpi label="Taux de réussite" value={pct(stats.hitRate)} sub={`${stats.heldCount} positions tenues jusqu'au bout`} />
            <Kpi label="Avantage sur le marché" value={signedPts(stats.edge)} color={tone(stats.edge)}
              sub="Issue réelle moins prix payé, en moyenne" />
            <Kpi label="Résultat estimé" value={signed(stats.pnl, " pts")} color={tone(stats.pnl)}
              sub={stats.roi !== null ? `Rendement ${pct(stats.roi)} des mises` : ""} />
            <Kpi label="Prix d'entrée moyen" value={pct(stats.avgEntry)}
              sub={stats.avgEntry > 0.6 ? "Joue surtout les favoris" : stats.avgEntry < 0.4 ? "Joue surtout les outsiders" : "Profil équilibré"} />
            <Kpi label="Série en cours" value={String(stats.currentStreak)} sub={`Record : ${stats.bestStreak}`} />
            <Kpi label="Marchés suivis" value={String(stats.totalMarkets)} sub={`${stats.openMarkets} en cours`} />
          </div>

          <Section title="Comment lire l'avantage"
            text="Si tu achètes un choix à 30 %, le marché estime qu'il se réalise 3 fois sur 10. Un avantage positif signifie que, sur la durée, tes choix se réalisent plus souvent que le prix ne le laissait penser. C'est la mesure la plus honnête de la qualité d'une prévision." />

          <h2 style={h2}>Calibration</h2>
          <p style={muted}>Les choix achetés à x % se réalisent-ils x % du temps ? La barre pleine est la fréquence réelle, le trait la fréquence attendue.</p>
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: "12px" }}>
            {stats.calibration.map((b) => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ width: "72px", fontSize: "13px", color: "var(--k-muted2)" }}>{b.label}</span>
                <div style={{ flex: 1, position: "relative", height: "14px", background: "var(--k-surface2)", borderRadius: "7px" }}>
                  {b.observed !== null && (
                    <div style={{ width: `${b.observed * 100}%`, height: "100%", background: "var(--k-accent)", borderRadius: "7px" }} />
                  )}
                  {b.expected !== null && (
                    <div style={{ position: "absolute", left: `${b.expected * 100}%`, top: "-3px", width: "2px", height: "20px", background: "#fff" }} />
                  )}
                </div>
                <span style={{ width: "92px", textAlign: "right", fontSize: "13px", color: "var(--k-text)" }}>
                  {b.n ? `${pct(b.observed)} (${b.n})` : "aucune"}
                </span>
              </div>
            ))}
          </div>

          {stats.curve.length > 1 && (
            <>
              <h2 style={h2}>Résultat cumulé</h2>
              <div style={card}><Curve points={stats.curve} /></div>
            </>
          )}

          {stats.categories.length > 0 && (
            <>
              <h2 style={h2}>Par catégorie</h2>
              <div style={{ ...card, padding: 0, overflowX: "auto" }}>
                <table style={table}>
                  <thead>
                    <tr>{["Catégorie", "Positions", "Réussite", "Avantage", "Résultat"].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {stats.categories.map((c) => (
                      <tr key={c.name}>
                        <td style={td}>{c.name}</td>
                        <td style={td}>{c.n}</td>
                        <td style={td}>{pct(c.hit)}</td>
                        <td style={{ ...td, color: tone(c.edge) }}>{signedPts(c.edge)}</td>
                        <td style={{ ...td, color: tone(c.pnl) }}>{signed(c.pnl, " pts")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {(stats.bestBet || stats.worstBet) && (
            <div style={{ ...grid, marginTop: "20px" }}>
              {stats.bestBet && <Highlight title="Meilleur pari" p={stats.bestBet} />}
              {stats.worstBet && <Highlight title="Pire pari" p={stats.worstBet} />}
            </div>
          )}

          <h2 style={h2}>Historique</h2>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            {[["all", "Tous"], ["won", "Gagnés"], ["lost", "Perdus"], ["early", "Clôturés avant"]].map(([k, l]) => (
              <button key={k} onClick={() => { setFilter(k); setShown(15); }} style={chip(filter === k)}>{l}</button>
            ))}
            <select value={cat} onChange={(e) => { setCat(e.target.value); setShown(15); }} style={{ ...chip(false), padding: "5px 10px" }} aria-label="Catégorie">
              <option value="">Toutes catégories</option>
              {stats.categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {rows.slice(0, shown).map((p, i) => (
              <Link key={`${p.marketId}${p.choice}${i}`} to={`/market/${p.marketId}`} style={row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "var(--k-text)", fontSize: "14px", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.question}</div>
                  <div style={{ color: "var(--k-muted)", fontSize: "12px", marginTop: "4px" }}>
                    {p.choice}{p.entry !== null ? ` à ${Math.round(p.entry * 100)} %` : ""}
                    {p.resolvedAt ? ` · ${new Date(p.resolvedAt).toLocaleDateString("fr-FR")}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: p.closedEarly ? "var(--k-muted2)" : p.won ? GREEN : RED, fontSize: "13px" }}>
                    {p.closedEarly ? "Clôturé avant" : p.won ? "Gagné" : "Perdu"}
                  </div>
                  <div style={{ color: tone(p.pnl), fontSize: "13px" }}>{signed(p.pnl, " pts")}</div>
                </div>
              </Link>
            ))}
            {rows.length === 0 && <p style={muted}>Aucune position ne correspond.</p>}
          </div>
          {rows.length > shown && (
            <button onClick={() => setShown((n) => n + 15)} style={{ ...chip(false), margin: "16px auto 0", display: "block", padding: "10px 22px" }}>
              Voir plus ({rows.length - shown})
            </button>
          )}

          <p style={{ ...muted, marginTop: "28px", fontSize: "12px" }}>
            Méthode : le résultat est estimé en rejouant la règle de distribution des gains sur les paris publics de chaque marché, il peut différer de quelques points du solde réel. Une position vendue avant la résolution est comptée dans le résultat mais pas dans le taux de réussite ni l'avantage. Seuls les {100} marchés résolus les plus récents sont analysés.
          </p>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, color = "var(--k-text)" }) {
  return (
    <div style={card}>
      <div style={{ fontSize: "12px", color: "var(--k-muted)", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: "12px", color: "var(--k-muted)", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

function Section({ title, text }) {
  return (
    <div style={{ ...card, margin: "16px 0 8px", background: "rgba(var(--k-accent-rgb),0.07)" }}>
      <div style={{ fontWeight: 600, color: "var(--k-accent-text)", fontSize: "14px", marginBottom: "4px" }}>{title}</div>
      <div style={{ fontSize: "13px", color: "var(--k-text2)", lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function Highlight({ title, p }) {
  return (
    <Link to={`/market/${p.marketId}`} style={{ ...card, textDecoration: "none", display: "block" }}>
      <div style={{ fontSize: "12px", color: "var(--k-muted)", marginBottom: "6px" }}>{title}</div>
      <div style={{ fontSize: "14px", color: "var(--k-text)", lineHeight: 1.35, marginBottom: "6px" }}>{p.question}</div>
      <div style={{ fontWeight: 700, color: tone(p.pnl) }}>{signed(p.pnl, " pts")}</div>
    </Link>
  );
}

function Curve({ points }) {
  const W = 760, H = 150, PAD = 8;
  const vs = points.map((p) => p.v);
  const min = Math.min(0, ...vs), max = Math.max(0, ...vs);
  const span = max - min || 1;
  const x = (i) => PAD + (i / (points.length - 1)) * (W - 2 * PAD);
  const y = (v) => H - PAD - ((v - min) / span) * (H - 2 * PAD);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1].v;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Résultat cumulé">
      <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} stroke="var(--k-border2)" strokeDasharray="4 4" />
      <path d={d} fill="none" stroke={last >= 0 ? GREEN : RED} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

const card = { background: "var(--k-inset)", border: "0.5px solid rgba(var(--k-accent-rgb),0.25)", borderRadius: "12px", padding: "16px" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "12px" };
const h2 = { fontSize: "18px", color: "var(--k-text)", margin: "28px 0 6px" };
const muted = { color: "var(--k-muted)", fontSize: "13px", margin: "0 0 12px", lineHeight: 1.5 };
const table = { width: "100%", borderCollapse: "collapse", fontSize: "14px" };
const th = { textAlign: "left", padding: "10px 14px", color: "var(--k-muted)", fontWeight: 600, fontSize: "12px", borderBottom: "1px solid var(--k-surface2)" };
const td = { padding: "10px 14px", color: "var(--k-text)", borderBottom: "1px solid var(--k-border)" };
const row = { display: "flex", gap: "14px", alignItems: "center", textDecoration: "none", background: "var(--k-inset)", border: "0.5px solid rgba(var(--k-accent-rgb),0.2)", borderRadius: "10px", padding: "12px 14px" };
const chip = (active) => ({
  fontSize: "13px", padding: "6px 14px", borderRadius: "20px", cursor: "pointer",
  border: active ? "1px solid var(--k-accent)" : "1px solid var(--k-border)",
  background: active ? "rgba(var(--k-accent-rgb),0.18)" : "transparent", color: active ? "var(--k-accent-text)" : "var(--k-muted2)",
});
