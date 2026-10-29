import { useState } from "react";

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Bouton « Intégrer » : affiche le code à copier pour afficher le marché sur un autre site.
export default function EmbedCode({ marketId, question, isMulti }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const height = isMulti ? 230 : 150;
  const code =
`<iframe src="https://kassandre.app/embed/${marketId}" width="100%" height="${height}" style="border:0;max-width:520px" loading="lazy" title="${esc(question)}"></iframe>
<p style="font-size:12px"><a href="https://kassandre.app/market/${marketId}">${esc(question)} (Kassandre)</a></p>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* presse-papiers indisponible */ }
  }

  const btn = { display: "flex", alignItems: "center", gap: "6px", background: "rgba(var(--k-accent-rgb),0.1)", border: "0.5px solid rgba(var(--k-accent-rgb),0.3)", color: "var(--k-accent-text)", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: "500", cursor: "pointer" };

  return (
    <>
      <button onClick={() => setOpen(true)} style={btn}>{"</>"} Intégrer</button>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--k-inset)", border: "0.5px solid rgba(var(--k-accent-rgb),0.4)", borderRadius: "12px", padding: "20px", width: "min(560px, 100%)", color: "var(--k-text)" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Intégrer ce marché sur votre site</p>
            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--k-muted)", lineHeight: 1.5 }}>
              Collez ce code dans votre article ou votre blog. La probabilité se met à jour en direct. Ajoutez <code>?theme=light</code> à l'adresse de l'iframe pour un fond clair.
            </p>
            <textarea readOnly value={code} onFocus={(e) => e.target.select()} style={{ width: "100%", boxSizing: "border-box", minHeight: "120px", background: "var(--k-bg)", color: "var(--k-text)", border: "1px solid var(--k-border)", borderRadius: "8px", padding: "10px", fontSize: "12px", fontFamily: "monospace", resize: "none" }} />
            <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "flex-end" }}>
              <button onClick={() => setOpen(false)} style={{ ...btn, background: "transparent" }}>Fermer</button>
              <button onClick={copy} style={{ ...btn, background: "var(--k-accent)", color: "#fff", border: "none", fontWeight: 600 }}>{copied ? "Copié" : "Copier le code"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
