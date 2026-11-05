import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSEO } from "../hooks/useSEO";
import { calcShares, calcSharesLMSR, getPricesLMSR, defaultLiquidityB } from "../lib/amm.js";

const COLORS = ["#7c3aed", "#22c55e", "#f59e0b", "#06b6d4", "#ef4444"];
const card = { background: "var(--k-inset)", border: "1px solid var(--k-border)", borderRadius: "12px", padding: "18px", marginBottom: "20px" };
const pill = (on) => ({ padding: "6px 14px", borderRadius: "8px", border: on ? "none" : "0.5px solid rgba(var(--k-accent-rgb),0.3)", background: on ? "var(--k-accent)" : "rgba(var(--k-accent-rgb),0.1)", color: on ? "#fff" : "var(--k-accent-text)", fontSize: "13px", fontWeight: 600, cursor: "pointer" });
const pct = (v) => `${(v * 100).toFixed(1).replace(".", ",")} %`;
const num = (v, d = 1) => v.toFixed(d).replace(".", ",");

function Slider({ label, value, min, max, step = 1, onChange, unit = "" }) {
  return (
    <label style={{ display: "block", marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--k-muted)", marginBottom: "4px" }}>
        <span>{label}</span><b style={{ color: "var(--k-text)" }}>{value}{unit}</b>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--k-accent)" }} />
    </label>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div style={{ flex: "1 1 120px", background: "var(--k-surface2)", borderRadius: "10px", padding: "10px 12px" }}>
      <div style={{ fontSize: "12px", color: "var(--k-muted)" }}>{label}</div>
      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--k-text)" }}>{value}</div>
      {hint && <div style={{ fontSize: "11px", color: "var(--k-faint)" }}>{hint}</div>}
    </div>
  );
}

// Courbe : prix du « Oui » après un pari de x points, de 0 à 500
function ImpactCurve({ compute, current }) {
  const W = 320, H = 150, P = 28;
  const pts = [];
  for (let a = 0; a <= 500; a += 10) pts.push([a, compute(a)]);
  const x = (a) => P + (a / 500) * (W - 1.5 * P);
  const y = (v) => H - P - v * (H - 1.6 * P);
  const d = pts.map(([a, v], i) => `${i ? "L" : "M"}${x(a).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: "420px" }} role="img" aria-label="Prix après un pari, selon la taille du pari">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={P} x2={W - P / 2} y1={y(t)} y2={y(t)} stroke="var(--k-border)" strokeDasharray="3 4" />
          <text x={P - 6} y={y(t) + 4} fontSize="10" fill="var(--k-muted)" textAnchor="end">{t * 100}%</text>
        </g>
      ))}
      <path d={d} fill="none" stroke="var(--k-accent)" strokeWidth="2.2" />
      <circle cx={x(current.amount)} cy={y(current.price)} r="5" fill="var(--k-accent)" />
      <text x={W / 2} y={H - 6} fontSize="10" fill="var(--k-muted)" textAnchor="middle">Taille du pari, de 0 à 500 points</text>
    </svg>
  );
}

function Binary() {
  const [amount, setAmount] = useState(50);
  const [side, setSide] = useState("yes");
  const pool = { y: 100, n: 100 };

  const priceAfter = (a, s = side) => {
    if (a <= 0) return 0.5;
    const r = calcShares(pool.y, pool.n, s, a);
    return r.newPoolNo / (r.newPoolYes + r.newPoolNo);
  };
  const r = amount > 0 ? calcShares(pool.y, pool.n, side, amount) : null;
  const after = priceAfter(amount);

  return (
    <div style={card}>
      <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem" }}>Marché Oui / Non</h2>
      <p style={{ margin: "0 0 14px", fontSize: "14px", color: "var(--k-muted)", lineHeight: 1.6 }}>
        Deux réserves de 100 points, une pour « Oui » et une pour « Non », dont le produit reste constant. Le prix du « Oui » est la part de la réserve « Non » dans le total. Au départ, 50 %.
      </p>
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        <button style={pill(side === "yes")} onClick={() => setSide("yes")}>Je parie Oui</button>
        <button style={pill(side === "no")} onClick={() => setSide("no")}>Je parie Non</button>
      </div>
      <Slider label="Montant du pari" value={amount} min={0} max={500} step={5} unit=" pts" onChange={setAmount} />
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
        <Stat label="Probabilité Oui avant" value="50,0 %" />
        <Stat label="Probabilité Oui après" value={pct(after)} hint={amount > 0 ? `${after >= 0.5 ? "+" : ""}${num((after - 0.5) * 100)} points` : ""} />
        <Stat label="Parts obtenues" value={r ? num(r.shares) : "0"} hint="après 2 % de frais" />
        <Stat label="Prix moyen par part" value={r ? num(r.pricePerShare, 2) : "0"} hint="pts" />
      </div>
      <ImpactCurve compute={(a) => priceAfter(a)} current={{ amount, price: after }} />
      <p style={{ fontSize: "13px", color: "var(--k-muted)", lineHeight: 1.6, margin: "8px 0 0" }}>
        Plus le pari est gros, plus il déplace le prix, et plus le prix moyen payé par part s'éloigne du prix affiché. C'est ce qui empêche une seule personne de fixer la probabilité à bas coût.
      </p>
    </div>
  );
}

const NAMES = ["Option A", "Option B", "Option C", "Option D"];

function Multi() {
  const [n, setN] = useState(4);
  const [amount, setAmount] = useState(100);
  const [pick, setPick] = useState(0);
  const [bUser, setBUser] = useState(null);
  const b = bUser ?? defaultLiquidityB(n);
  const q0 = useMemo(() => Array(n).fill(0), [n]);
  const idx = Math.min(pick, n - 1);

  const before = getPricesLMSR(q0, b);
  const res = amount > 0 ? calcSharesLMSR(q0, b, idx, amount) : null;
  const afterPrices = res ? getPricesLMSR(res.newQuantities, b) : before;
  const maxLoss = b * Math.log(n);

  return (
    <div style={card}>
      <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem" }}>Marché multi-choix</h2>
      <p style={{ margin: "0 0 14px", fontSize: "14px", color: "var(--k-muted)", lineHeight: 1.6 }}>
        Ici, plus de deux réserves : un teneur de marché automatique, le LMSR, calcule toutes les probabilités ensemble pour qu'elles totalisent toujours 100 %. Le paramètre b règle la profondeur du marché.
      </p>
      <Slider label="Nombre d'options" value={n} min={2} max={4} onChange={(v) => { setN(v); setBUser(null); setPick(0); }} />
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
        {NAMES.slice(0, n).map((name, i) => <button key={name} style={pill(i === idx)} onClick={() => setPick(i)}>Je parie sur {name}</button>)}
      </div>
      <Slider label="Montant du pari" value={amount} min={0} max={500} step={5} unit=" pts" onChange={setAmount} />
      <Slider label={`Profondeur b (valeur de Kassandre : ${defaultLiquidityB(n)})`} value={Math.round(b)} min={20} max={400} step={5} onChange={setBUser} />

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "6px 0 14px" }}>
        {NAMES.slice(0, n).map((name, i) => (
          <div key={name}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "3px" }}>
              <span style={{ color: "var(--k-text)", fontWeight: i === idx ? 700 : 500 }}>{name}</span>
              <span style={{ color: COLORS[i] }}><b>{pct(afterPrices[i])}</b> <span style={{ color: "var(--k-faint)" }}>(avant {pct(before[i])})</span></span>
            </div>
            <div style={{ position: "relative", height: "6px", borderRadius: "3px", background: "var(--k-surface2)" }}>
              <div style={{ position: "absolute", inset: 0, width: `${afterPrices[i] * 100}%`, background: COLORS[i], borderRadius: "3px", transition: "width .25s" }} />
              <div style={{ position: "absolute", top: "-3px", bottom: "-3px", left: `${before[i] * 100}%`, width: "2px", background: "var(--k-muted)" }} title="Probabilité avant le pari" />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Stat label="Parts obtenues" value={res ? num(res.shares) : "0"} hint="après 2 % de frais" />
        <Stat label="Prix moyen par part" value={res ? num(res.pricePerShare, 2) : "0"} hint="pts" />
        <Stat label="Perte maximale du teneur" value={`${Math.round(maxLoss)} pts`} hint="b multiplié par ln(n)" />
      </div>
      <p style={{ fontSize: "13px", color: "var(--k-muted)", lineHeight: 1.6, margin: "10px 0 0" }}>
        Un b petit rend le prix très sensible : quelques points suffisent à le déplacer. Un b grand le rend stable, mais le marché met plus de paris à bouger. C'est le compromis du LMSR.
      </p>
    </div>
  );
}

export default function LabPrix() {
  const [tab, setTab] = useState("binary");
  const seo = useSEO({
    title: "Comment se forme le prix d'un marché de prédiction",
    description: "Une démonstration interactive des deux mécanismes de Kassandre : le marché Oui/Non à réserves constantes et le LMSR des marchés multi-choix. Bougez les curseurs et voyez la probabilité réagir.",
    url: "/lab/prix",
  });
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "8px 0 40px" }}>
      {seo}
      <p style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--k-accent)", margin: "0 0 6px", fontWeight: 700 }}>Kassandre Lab</p>
      <h1 style={{ fontSize: "1.6rem", margin: "0 0 10px", color: "var(--k-text)" }}>Comment se forme le prix d'un marché de prédiction</h1>
      <p style={{ color: "var(--k-muted2)", lineHeight: 1.7, margin: "0 0 20px" }}>
        Chaque pari déplace la probabilité affichée. Voici, avec les formules exactes utilisées sur Kassandre, comment cela se passe pour un marché Oui/Non puis pour un marché à plusieurs options. Bougez les curseurs.
      </p>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button style={pill(tab === "binary")} onClick={() => setTab("binary")}>Oui / Non</button>
        <button style={pill(tab === "multi")} onClick={() => setTab("multi")}>Multi-choix</button>
      </div>
      {tab === "binary" ? <Binary /> : <Multi />}
      <p style={{ fontSize: "13px", color: "var(--k-muted)", lineHeight: 1.6 }}>
        Les points sont virtuels. Le prix sert de signal de probabilité, et chaque pari reçoit un nombre de parts qui pèse dans le partage final entre gagnants.
      </p>
      <Link to="/blog" style={{ color: "var(--k-accent)", fontWeight: 600, textDecoration: "none" }}>Lire l'article qui explique tout ça →</Link>
    </div>
  );
}
