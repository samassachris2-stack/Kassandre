import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { notify } from "../lib/notify";
import EmbedCode from "./EmbedCode";

const PAGE_URL = "https://kassandre.app/presidentielle-2027";

// Les trois questions « phares » du baromètre, repérées par leur intitulé
// pour que les marchés créés par CSV s'y branchent sans configuration.
const TABS = [
  { key: "elu", label: "Élu président", match: /élu|elu|élysée|elysee/i },
  { key: "tete", label: "En tête au 1er tour", match: /en tête|en tete/i },
  { key: "deuxieme", label: "2e du 1er tour", match: /deuxième|deuxieme|second|2e/i },
];

// Familles politiques, rangées de gauche à droite (c'est l'ordre de la barre de poids).
const CAMPS = [
  { key: "gauche", label: "Gauche", color: "#ef4444", match: /mélenchon|melenchon|glucksmann|tondelier|ruffin|hollande/i },
  { key: "centre", label: "Centre", color: "#f59e0b", match: /philippe|attal|villepin/i },
  { key: "droite", label: "Droite", color: "#38bdf8", match: /retailleau/i },
  { key: "rn", label: "Extrême droite", color: "#5b7cfa", match: /le pen|bardella/i },
];
const OTHER = { key: "autre", label: "Autres", color: "#6b7280" };
const campOf = (label) => CAMPS.find((c) => c.match.test(label)) || OTHER;
const initials = (label) => label.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase();

function pickMarkets(markets) {
  const multis = markets.filter((m) => m.type === "multi" && m.status === "open");
  const out = [];
  for (const t of TABS) {
    const m = multis.find((x) => t.match.test(x.question || "") && !out.some((o) => o.market.id === x.id));
    if (m) out.push({ ...t, market: m });
  }
  return out;
}

export default function PresidentialBarometer({ markets }) {
  const tabs = useMemo(() => pickMarkets(markets), [markets]);
  const [active, setActive] = useState(0);
  const [options, setOptions] = useState([]);
  const current = tabs[Math.min(active, tabs.length - 1)];
  const marketId = current?.market.id;

  useEffect(() => {
    if (!marketId) return;
    return onSnapshot(
      collection(db, "markets", marketId, "options"),
      (snap) => setOptions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setOptions([]),
    );
  }, [marketId]);

  const rows = useMemo(() => {
    const n = options.length || 1;
    return [...options]
      .map((o) => ({ label: o.label, pct: (o.price ?? 1 / n) * 100, camp: campOf(o.label) }))
      .sort((a, b) => (a.camp.key === "autre") - (b.camp.key === "autre") || b.pct - a.pct);
  }, [options]);

  const camps = useMemo(() => {
    const sums = new Map();
    rows.filter((r) => r.camp.key !== "autre").forEach((r) => sums.set(r.camp.key, (sums.get(r.camp.key) || 0) + r.pct));
    return CAMPS.filter((c) => sums.has(c.key)).map((c) => ({ ...c, pct: sums.get(c.key) }));
  }, [rows]);

  if (!current) return null;
  const top = rows.slice(0, 7);
  const leader = top.find((r) => r.camp.key !== "autre") || top[0];
  // Échelle commune : 0 à max(40 %, meilleur score), pour que les écarts restent honnêtes
  const scale = Math.max(40, ...top.map((r) => r.pct));

  async function shareImage() {
    const { generateBarometerImage, shareBarometerImage } = await import("../lib/shareCard.js");
    const blob = await generateBarometerImage({
      title: current.market.question,
      rows: top.slice(0, 6).map((r) => ({ label: r.label, pct: Math.round(r.pct), color: r.camp.color })),
    });
    shareBarometerImage(blob, { linkUrl: PAGE_URL });
  }

  function shareX() {
    const lead = top[0] ? `${top[0].label} ${Math.round(top[0].pct)} %` : "";
    const text = `Présidentielle 2027 : ${current.market.question}\n${lead ? `En tête : ${lead}\n` : ""}Probabilités en direct, estimées par les membres de Kassandre.`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(PAGE_URL)}`, "_blank");
  }

  function shareLinkedIn() {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(PAGE_URL)}`, "_blank");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(PAGE_URL);
      notify("Lien copié dans le presse-papiers", "success");
    } catch { /* presse-papiers indisponible */ }
  }

  const btn = { background: "rgba(var(--k-accent-rgb),0.1)", border: "0.5px solid rgba(var(--k-accent-rgb),0.3)", color: "var(--k-accent-text)", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: 500, cursor: "pointer" };

  return (
    <section aria-label="Baromètre de la présidentielle 2027" style={{ background: "var(--k-inset)", border: "1px solid var(--k-border)", borderRadius: "12px", padding: "18px", margin: "0 0 24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", color: "var(--k-text)" }}>Le baromètre Kassandre</h2>
        <span style={{ fontSize: "12px", color: "var(--k-muted)" }}>Premier tour le 18 avril 2027, second tour le 2 mai</span>
      </div>

      {tabs.length > 1 && (
        <div role="tablist" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
          {tabs.map((t, i) => (
            <button key={t.key} role="tab" aria-selected={i === active} onClick={() => setActive(i)}
              style={{ ...btn, background: i === active ? "var(--k-accent)" : btn.background, color: i === active ? "#fff" : btn.color, border: i === active ? "none" : btn.border }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <Link to={`/market/${current.market.id}`} style={{ color: "var(--k-text)", fontWeight: 600, fontSize: "15px", textDecoration: "none", display: "block", marginBottom: "12px" }}>
        {current.market.question}
      </Link>

      {top.length === 0 ? (
        <p style={{ color: "var(--k-muted)", fontSize: "14px", margin: 0 }}>Chargement des probabilités…</p>
      ) : (
        <>
          {leader && (
            <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 16px", marginBottom: "14px", borderRadius: "12px", background: `${leader.camp.color}22`, border: `1px solid ${leader.camp.color}66` }}>
              <div style={{ fontSize: "2.6rem", fontWeight: 800, lineHeight: 1, color: leader.camp.color }}>{Math.round(leader.pct)} %</div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--k-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Favori de la communauté</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--k-text)" }}>{leader.label}</div>
              </div>
            </div>
          )}

          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            {top.map((r) => (
              <li key={r.label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span aria-hidden="true" style={{ flex: "0 0 30px", height: "30px", borderRadius: "50%", background: `${r.camp.color}33`, border: `1.5px solid ${r.camp.color}`, color: r.camp.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>
                  {r.camp.key === "autre" ? "…" : initials(r.label)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "6px" }}>
                    <span style={{ color: "var(--k-text)", fontWeight: r === leader ? 700 : 500 }}>{r.label}</span>
                    <span style={{ fontWeight: 700, color: r.camp.color }}>{Math.round(r.pct)} %</span>
                  </div>
                  <div style={{ height: "4px", borderRadius: "2px", background: "var(--k-surface2)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(1.5, (r.pct / scale) * 100)}%`, height: "100%", background: r.camp.color, borderRadius: "2px", transition: "width .5s" }} />
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {camps.length > 1 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "12px", color: "var(--k-muted)", marginBottom: "6px" }}>Poids de chaque famille politique, de la gauche à l'extrême droite</div>
              <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", gap: "2px" }}>
                {camps.map((c) => <div key={c.key} title={`${c.label} : ${Math.round(c.pct)} %`} style={{ flex: c.pct, background: c.color }} />)}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: "8px", fontSize: "12px", color: "var(--k-muted)" }}>
                {camps.map((c) => (
                  <span key={c.key}><span style={{ display: "inline-block", width: "9px", height: "9px", borderRadius: "50%", background: c.color, marginRight: "5px" }} />{c.label} <b style={{ color: "var(--k-text)" }}>{Math.round(c.pct)} %</b></span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: "12px", color: "var(--k-muted)", margin: "12px 0" }}>
        Probabilités estimées en direct par la communauté, en points virtuels. Ce n'est pas un sondage.
      </p>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={shareX} style={btn} title="Partager sur X">𝕏</button>
        <button onClick={shareLinkedIn} style={btn} title="Partager sur LinkedIn">in</button>
        <button onClick={shareImage} style={btn}>Image à partager</button>
        <button onClick={copyLink} style={btn}>Copier le lien</button>
        <EmbedCode marketId={current.market.id} question={current.market.question} isMulti />
      </div>
    </section>
  );
}
