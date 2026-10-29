import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = "https://kassandre.app/api/v1";
const ageLabel = (a) => (a === "65+" ? "65 ans et plus" : `${a.replace("-", " à ")} ans`);
const colorOf = (p) => `color-mix(in srgb, #22c55e ${p}%, #ef4444)`;

// Disposition schématique de Paris : une case par arrondissement, placées
// approximativement comme sur le terrain (nord en haut).
const PARIS_GRID = [
  [null, 17, 18, 19, null],
  [16, 8, 9, 10, 20],
  [7, 1, 2, 3, 11],
  [15, 6, 5, 4, 12],
  [null, 14, 13, null, null],
];

function Legend() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--k-muted)", marginTop: "10px", justifyContent: "center" }}>
      <span>NON</span>
      <span style={{ width: "120px", height: "8px", borderRadius: "4px", background: "linear-gradient(to right, #ef4444, #22c55e)" }} />
      <span>OUI</span>
      <span style={{ marginLeft: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
        <span style={{ width: "10px", height: "10px", background: "var(--k-surface2)", border: "1px solid var(--k-border2)" }} /> groupe trop petit
      </span>
    </div>
  );
}


function WorldMap({ groups, onPickFrance }) {
  const [geo, setGeo] = useState(null);
  const [vb, setVb] = useState(null);
  useEffect(() => {
    let alive = true;
    import("../lib/worldMap.json").then((m) => { if (alive) { setGeo(m.default); setVb({ x: 0, y: 0, w: m.default.w, h: m.default.h }); } });
    return () => { alive = false; };
  }, []);
  if (!geo || !vb) return <p style={{ fontSize: "13px", color: "var(--k-muted)" }}>Chargement de la carte...</p>;

  // Zoom animé vers la France, puis bascule sur la carte des départements.
  function zoomFrance() {
    const from = { x: 0, y: 0, w: geo.w, h: geo.h };
    const f = geo.focus.FR;
    const to = { x: f.x, y: f.y, w: f.w, h: f.h };
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { onPickFrance(); return; }
    const t0 = performance.now(), dur = 450;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      setVb({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e });
      if (k < 1) requestAnimationFrame(step); else onPickFrance();
    };
    requestAnimationFrame(step);
  }

  return (
    <>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} style={{ width: "100%", display: "block", margin: "0 auto" }} role="img" aria-label="Carte du monde">
        {geo.paths.map((p) => {
          const g = groups[p.code];
          const isFr = p.code === "FR";
          return (
            <path
              key={p.code} d={p.d}
              fill={g ? colorOf(g.yesPct) : "var(--k-surface2)"} stroke="var(--k-surface)" strokeWidth="0.5"
              style={isFr ? { cursor: "pointer" } : undefined}
              onClick={isFr ? zoomFrance : undefined}
              tabIndex={isFr ? 0 : undefined}
              onKeyDown={isFr ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); zoomFrance(); } } : undefined}
              role={isFr ? "button" : undefined}
            >
              <title>{g ? `${p.nom} : ${g.yesPct} % pour OUI (${g.n} membres)` : `${p.nom} : pas assez de membres`}{isFr ? " · cliquer pour zoomer" : ""}</title>
            </path>
          );
        })}
      </svg>
      <p style={{ fontSize: "12px", color: "var(--k-muted)", textAlign: "center", margin: "6px 0 0" }}>Clique sur la France pour voir le détail par département.</p>
      <Legend />
    </>
  );
}

function FranceMap({ groups }) {
  const [geo, setGeo] = useState(null);
  useEffect(() => {
    let alive = true;
    import("../lib/franceMap.json").then((m) => { if (alive) setGeo(m.default); });
    return () => { alive = false; };
  }, []);
  if (!geo) return <p style={{ fontSize: "13px", color: "var(--k-muted)" }}>Chargement de la carte...</p>;
  return (
    <>
      <svg viewBox={`0 0 ${geo.w} ${geo.h}`} style={{ width: "100%", maxWidth: "440px", display: "block", margin: "0 auto" }} role="img" aria-label="Carte de France par département">
        {geo.paths.map((p) => {
          const g = groups[p.code];
          return (
            <path key={p.code} d={p.d} fill={g ? colorOf(g.yesPct) : "var(--k-surface2)"} stroke="var(--k-surface)" strokeWidth="0.8">
              <title>{g ? `${p.nom} : ${g.yesPct} % pour OUI (${g.n} membres)` : `${p.nom} : pas assez de membres`}</title>
            </path>
          );
        })}
      </svg>
      <Legend />
    </>
  );
}

function ParisMap({ groups }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", maxWidth: "380px", margin: "0 auto" }}>
        {PARIS_GRID.flat().map((n, i) => {
          if (n == null) return <div key={i} />;
          const g = groups[n];
          return (
            <div
              key={i}
              title={g ? `${n}e arrondissement : ${g.yesPct} % pour OUI (${g.n} membres)` : `${n}e arrondissement : pas assez de membres`}
              style={{
                aspectRatio: "1", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: g ? colorOf(g.yesPct) : "var(--k-surface2)", border: g ? "none" : "1px solid var(--k-border2)",
                color: g ? "#0a0a0f" : "var(--k-muted)", fontSize: "13px", fontWeight: 700,
              }}
            >
              <span>{n}</span>
              {g && <span style={{ fontSize: "11px", fontWeight: 600 }}>{g.yesPct}%</span>}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: "11px", color: "var(--k-faint)", textAlign: "center", margin: "8px 0 0" }}>Plan schématique, pas à l'échelle.</p>
      <Legend />
    </>
  );
}

function Bars({ rows, avg, outcome }) {
  if (rows.length === 0) return <p style={{ fontSize: "13px", color: "var(--k-muted)" }}>Pas encore assez de membres par groupe.</p>;
  // Marché résolu : on montre la part de membres qui avaient vu juste.
  const shown = (r) => (outcome === "no" ? 100 - r.yesPct : r.yesPct);
  const ref = avg == null ? null : outcome === "no" ? 100 - avg : avg;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
      {rows.map((r) => {
        const v = shown(r);
        const delta = ref == null ? null : v - ref;
        return (
          <div key={r.key}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--k-text2)", marginBottom: "3px", gap: "10px" }}>
              <span>{r.label}</span>
              <span style={{ color: "var(--k-muted)", whiteSpace: "nowrap" }}>
                <strong style={{ color: "var(--k-text)" }}>{v} %</strong> {outcome ? "avaient raison" : "OUI"}
                {delta != null && Math.abs(delta) >= 1 && (
                  <span style={{ color: delta > 0 ? "var(--k-green, #22c55e)" : "var(--k-red, #ef4444)", marginLeft: "6px" }}>{delta > 0 ? "+" : "−"}{Math.abs(Math.round(delta))} pts</span>
                )}
                {" "}· {r.n} membres
              </span>
            </div>
            <div style={{ height: "8px", borderRadius: "4px", background: "rgba(239,68,68,0.55)", overflow: "hidden" }}>
              <div style={{ width: `${v}%`, height: "100%", background: "#22c55e" }} />
            </div>
          </div>
        );
      })}
      {ref != null && <p style={{ fontSize: "11px", color: "var(--k-faint)", margin: "2px 0 0" }}>Écart par rapport à l'ensemble des membres ({ref} %).</p>}
    </div>
  );
}

// "Qui pense quoi ?" : répartition des paris OUI / NON par territoire, âge et métier,
// à partir des profils partagés volontairement. Groupes de 10 personnes minimum.
export default function InsightsBlock({ marketId }) {
  const [data, setData] = useState(null);
  const [tabSel, setTab] = useState(null);
  const [scope, setScope] = useState("monde");

  useEffect(() => {
    let alive = true;
    fetch(`${API}/insights/${encodeURIComponent(marketId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) setData(j); })
      .catch(() => {});
    return () => { alive = false; };
  }, [marketId]);

  if (!data || !data.supported || data.profiled == null) return null;

  const sectorMarket = (data.categories || []).some((c) => ["Économie", "Tech", "Crypto"].includes(c));
  const tab = tabSel || (sectorMarket ? "metier" : "territoire");
  const labels = data.labels || {};
  const ageRows = Object.entries(data.byAge.groups)
    .sort((a, b) => (labels.ageBands || []).indexOf(a[0]) - (labels.ageBands || []).indexOf(b[0]))
    .map(([k, g]) => ({ key: k, label: ageLabel(k), ...g }));
  const jobRows = Object.entries(data.byProfession.groups)
    .sort((a, b) => b[1].n - a[1].n)
    .map(([k, g]) => ({ key: k, label: labels.professions?.[k] || k, ...g }));

  const tabBtn = (id, text) => (
    <button
      key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id}
      style={{
        padding: "7px 13px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        border: `1px solid ${tab === id ? "var(--k-accent)" : "var(--k-border)"}`,
        background: tab === id ? "rgba(var(--k-accent-rgb), 0.15)" : "var(--k-inset)",
        color: tab === id ? "var(--k-accent-text)" : "var(--k-muted2)",
      }}
    >{text}</button>
  );

  return (
    <section style={{ marginTop: "28px", textAlign: "left", border: "1px solid var(--k-border)", borderRadius: "12px", padding: "16px", background: "var(--k-surface)" }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--k-text)", margin: "0 0 4px" }}>Qui pense quoi ?</h3>
      <p style={{ fontSize: "12px", color: "var(--k-muted)", margin: "0 0 14px", lineHeight: 1.45 }}>
        Part des membres qui parient OUI, selon leur profil. Seuls les groupes d'au moins {data.minGroupSize} personnes sont affichés.
        {" "}{data.voters} parieurs au total, dont {data.profiled} ayant renseigné leur profil.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        {tabBtn("territoire", "Territoire")}
        {tabBtn("age", "Âge")}
        {tabBtn("metier", sectorMarket ? "Secteurs" : "Métier")}
      </div>

      {tab === "territoire" && (
        <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", justifyContent: "center" }}>
            {[["monde", "Monde"], ["france", "France"], ["paris", "Paris"]].map(([id, text]) => (
              <button key={id} type="button" onClick={() => setScope(id)} style={{
                padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${scope === id ? "var(--k-accent)" : "var(--k-border)"}`, background: "transparent",
                color: scope === id ? "var(--k-accent-text)" : "var(--k-muted2)",
              }}>{text}</button>
            ))}
          </div>
          {scope === "monde" && <WorldMap groups={data.byCountry?.groups || {}} onPickFrance={() => setScope("france")} />}
          {scope === "france" && <FranceMap groups={data.byDepartment.groups} />}
          {scope === "paris" && <ParisMap groups={data.byParisArrondissement.groups} />}
        </>
      )}
      {tab === "age" && <Bars rows={ageRows} avg={data.yesPct} outcome={data.outcome} />}
      {tab === "metier" && (
        <>
          {sectorMarket && <p style={{ fontSize: "13px", color: "var(--k-text2)", margin: "0 0 12px" }}>Ce que pensent les différents secteurs d'activité sur ce sujet.</p>}
          <Bars rows={jobRows} avg={data.yesPct} outcome={data.outcome} />
        </>
      )}

      <p style={{ fontSize: "11px", color: "var(--k-faint)", margin: "14px 0 0", lineHeight: 1.45 }}>
        {data.note} Chacun compte pour une voix. Les petits groupes sont arrondis à 5 % près.{" "}
        <Link to="/settings" style={{ color: "var(--k-accent-text)" }}>Ajouter mon profil</Link>
      </p>
    </section>
  );
}
