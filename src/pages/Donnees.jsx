import { useEffect, useState } from "react";
import { useSEO } from "../hooks/useSEO";

const BASE = "https://kassandre.app/api/v1";

const ENDPOINTS = [
  { path: "/markets", desc: "Liste des marchés, ouverts et passés.", params: "status (open, resolved), category, tag, q, limit (200 max), offset", example: "/markets?status=resolved&category=Politique&limit=20" },
  { path: "/markets/{id}", desc: "Fiche complète d'un marché : question, résultat, probabilité, preuves et sources.", params: "", example: null },
  { path: "/markets/{id}/history", desc: "Évolution de la probabilité dans le temps (en pourcents).", params: "", example: null },
  { path: "/markets.csv", desc: "Export CSV de tous les marchés.", params: "status, category, tag", example: "/markets.csv?status=resolved" },
  { path: "/markets/{id}/history.csv", desc: "Historique d'un marché en CSV.", params: "", example: null },
  { path: "/calibration", desc: "Fiabilité des probabilités de Kassandre : probabilité du marché avant la résolution contre résultat réel, et score de Brier.", params: "horizonDays (1 à 60, 7 par défaut)", example: "/calibration?horizonDays=7" },
  { path: "/stats", desc: "Nombre de marchés par statut et par catégorie.", params: "", example: "/stats" },
];

function CalibrationChart({ data }) {
  const pts = (data?.buckets || []).filter((b) => b.markets > 0);
  const W = 320, H = 320, P = 36;
  const x = (v) => P + v * (W - 2 * P);
  const y = (v) => H - P - v * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: "360px", display: "block", margin: "0 auto" }} role="img"
      aria-label="Courbe de calibration : probabilité annoncée contre fréquence observée">
      <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} fill="none" stroke="var(--k-border)" />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={P} y2={H - P} stroke="var(--k-border)" strokeDasharray="2 4" />
          <line x1={P} x2={W - P} y1={y(t)} y2={y(t)} stroke="var(--k-border)" strokeDasharray="2 4" />
          <text x={x(t)} y={H - P + 14} fontSize="10" textAnchor="middle" fill="var(--k-muted)">{Math.round(t * 100)}%</text>
          <text x={P - 6} y={y(t) + 3} fontSize="10" textAnchor="end" fill="var(--k-muted)">{Math.round(t * 100)}%</text>
        </g>
      ))}
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--k-muted)" strokeDasharray="5 4" />
      {pts.length > 1 && (
        <polyline fill="none" stroke="var(--k-accent)" strokeWidth="2" points={pts.map((b) => `${x(b.meanPredicted)},${y(b.observedYesRate)}`).join(" ")} />
      )}
      {pts.map((b) => (
        <circle key={b.range} cx={x(b.meanPredicted)} cy={y(b.observedYesRate)} r={4 + Math.min(6, b.markets)} fill="var(--k-accent)" fillOpacity="0.8">
          <title>{`${b.range} : ${b.markets} marché(s), ${Math.round(b.observedYesRate * 100)} % de OUI observés`}</title>
        </circle>
      ))}
      <text x={W / 2} y={H - 4} fontSize="10" textAnchor="middle" fill="var(--k-muted)">Probabilité annoncée par le marché</text>
      <text x={10} y={H / 2} fontSize="10" textAnchor="middle" fill="var(--k-muted)" transform={`rotate(-90 10 ${H / 2})`}>Fréquence réelle de OUI</text>
    </svg>
  );
}

export default function Donnees() {
  const seo = useSEO({
    title: "Données ouvertes et API",
    description: "Historique complet des marchés Kassandre, probabilités, résultats et sources : API gratuite, exports CSV et courbe de calibration.",
    url: "/donnees",
  });
  const [stats, setStats] = useState(null);
  const [calib, setCalib] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`${BASE}/stats`).then((r) => r.json()).then((j) => { if (alive) setStats(j); }).catch(() => { if (alive) setFailed(true); });
    fetch(`${BASE}/calibration?horizonDays=7`).then((r) => r.json()).then((j) => { if (alive) setCalib(j); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const box = { border: "1px solid var(--k-border)", borderRadius: "12px", padding: "18px", background: "var(--k-surface)", marginBottom: "18px", textAlign: "left" };
  const h2 = { fontSize: "1.1rem", margin: "0 0 10px", color: "var(--k-text)", textAlign: "left" };
  const code = { fontFamily: "ui-monospace, Consolas, monospace", fontSize: "12px", background: "var(--k-inset)", border: "1px solid var(--k-border)", borderRadius: "6px", padding: "2px 6px", overflowWrap: "anywhere" };
  const btn = { display: "inline-block", padding: "9px 14px", borderRadius: "8px", background: "var(--k-accent)", color: "#fff", fontWeight: 600, fontSize: "13px", textDecoration: "none" };

  return (
    <div style={{ maxWidth: "820px", margin: "32px auto", padding: "0 16px" }}>
      {seo}
      <h1 style={{ fontSize: "28px", margin: "0 0 8px", textAlign: "left" }}>Données ouvertes</h1>
      <p style={{ color: "var(--k-muted2)", fontSize: "15px", lineHeight: 1.6, marginBottom: "22px", textAlign: "left" }}>
        Chaque marché de Kassandre est archivé avec sa question, son résultat, l'évolution de sa probabilité et ses sources.
        Tout est en accès libre, y compris pour les marchés passés : journalistes, chercheurs et développeurs peuvent s'en servir gratuitement.
      </p>

      <section style={box}>
        <h2 style={h2}>En chiffres</h2>
        {stats?.markets != null ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "28px" }}>
            {[["Marchés archivés", stats.markets], ["Résolus", stats.resolved], ["Ouverts", stats.open]].map(([l, v]) => (
              <div key={l}><div style={{ fontSize: "26px", fontWeight: 800, color: "var(--k-text)" }}>{v}</div><div style={{ fontSize: "12px", color: "var(--k-muted)" }}>{l}</div></div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "13px", color: "var(--k-muted)" }}>{failed ? "Chiffres indisponibles pour le moment." : "Chargement..."}</p>
        )}
      </section>

      <section style={box}>
        <h2 style={h2}>Nos probabilités sont-elles fiables ?</h2>
        <p style={{ fontSize: "13px", color: "var(--k-muted2)", lineHeight: 1.55, marginBottom: "14px" }}>
          Pour chaque marché Oui/Non résolu, on compare la probabilité affichée 7 jours avant la résolution au résultat réel.
          Si les points suivent la diagonale, un événement annoncé à 70 % arrive bien environ 7 fois sur 10.
        </p>
        {calib && calib.markets > 0 ? (
          <>
            <CalibrationChart data={calib} />
            <p style={{ fontSize: "13px", color: "var(--k-muted2)", marginTop: "12px" }}>
              {calib.markets} marchés évalués · score de Brier : <strong style={{ color: "var(--k-text)" }}>{String(calib.brierScore).replace(".", ",")}</strong>{" "}
              <span style={{ color: "var(--k-muted)" }}>(0 = parfait, 0,25 = équivalent à répondre toujours 50 %)</span>
            </p>
          </>
        ) : (
          <p style={{ fontSize: "13px", color: "var(--k-muted)" }}>{calib ? "Pas encore assez de marchés résolus avec un historique suffisant." : "Chargement..."}</p>
        )}
      </section>

      <section style={box}>
        <h2 style={h2}>Télécharger</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <a style={btn} href={`${BASE}/markets.csv?status=resolved`}>Marchés résolus (CSV)</a>
          <a style={{ ...btn, background: "var(--k-surface2)", color: "var(--k-text)", border: "1px solid var(--k-border)" }} href={`${BASE}/markets.csv`}>Tous les marchés (CSV)</a>
        </div>
        <p style={{ fontSize: "12px", color: "var(--k-muted)", marginTop: "10px" }}>
          Licence <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer noopener" style={{ color: "var(--k-accent-text)" }}>CC BY 4.0</a> :
          réutilisation libre, y compris commerciale, en citant « Kassandre (kassandre.app) ».
        </p>
      </section>

      <section style={box}>
        <h2 style={h2}>API</h2>
        <p style={{ fontSize: "13px", color: "var(--k-muted2)", marginBottom: "12px" }}>
          Gratuite, sans clé, en lecture seule. Adresse de base : <span style={code}>{BASE}</span>. Les réponses sont en JSON et mises en cache 5 minutes.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {ENDPOINTS.map((e) => (
            <div key={e.path}>
              <div><span style={code}>GET {e.path}</span></div>
              <p style={{ fontSize: "13px", color: "var(--k-muted2)", margin: "4px 0 0" }}>{e.desc}</p>
              {e.params && <p style={{ fontSize: "12px", color: "var(--k-muted)", margin: "2px 0 0" }}>Paramètres : {e.params}</p>}
              {e.example && <p style={{ fontSize: "12px", margin: "2px 0 0" }}><a href={`${BASE}${e.example}`} target="_blank" rel="noreferrer noopener" style={{ color: "var(--k-accent-text)" }}>Essayer</a></p>}
            </div>
          ))}
        </div>
        <p style={{ fontSize: "13px", color: "var(--k-text)", fontWeight: 600, margin: "18px 0 6px" }}>Exemple en Python</p>
        <pre style={{ ...code, display: "block", padding: "12px", overflowX: "auto", whiteSpace: "pre", textAlign: "left", margin: 0 }}>{`import requests
r = requests.get("${BASE}/markets",
                params={"status": "resolved", "limit": 50}).json()
for m in r["data"]:
    print(m["question"], "->", m["outcomeLabel"])`}</pre>
        <p style={{ fontSize: "12px", color: "var(--k-muted)", marginTop: "12px" }}>
          Aucune donnée personnelle n'est exposée : pas de paris individuels, de comptes ni de soldes. Les probabilités sont des prévisions en points virtuels, pas des conseils financiers.
        </p>
      </section>
    </div>
  );
}
