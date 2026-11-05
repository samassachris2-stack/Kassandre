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
      .map((o) => ({ label: o.label, pct: (o.price ?? 1 / n) * 100 }))
      .sort((a, b) => b.pct - a.pct);
  }, [options]);

  if (!current) return null;
  const top = rows.slice(0, 6);
  const maxPct = top[0]?.pct || 1;

  async function shareImage() {
    const { generateBarometerImage, shareBarometerImage } = await import("../lib/shareCard.js");
    const blob = await generateBarometerImage({
      title: current.market.question,
      rows: top.map((r) => ({ label: r.label, pct: Math.round(r.pct) })),
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
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "9px" }}>
          {top.map((r) => (
            <li key={r.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "3px" }}>
                <span style={{ color: "var(--k-text)" }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: "var(--k-accent)" }}>{Math.round(r.pct)} %</span>
              </div>
              <div style={{ height: "8px", borderRadius: "4px", background: "var(--k-surface2)", overflow: "hidden" }}>
                <div style={{ width: `${(r.pct / maxPct) * 100}%`, height: "100%", background: "var(--k-accent)", transition: "width .4s" }} />
              </div>
            </li>
          ))}
        </ol>
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
