import { notify } from "../lib/notify";

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const t = document.createElement("textarea");
      t.value = text;
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(t);
      return ok;
    } catch {
      return false;
    }
  }
}

// Petit bouton qui copie l'identifiant d'un marché.
export default function CopyIdButton({ id, style }) {
  if (!id) return null;
  return (
    <button
      type="button"
      title="Copier l'ID du marché"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await copy(id);
        notify(ok ? "ID copié" : "Copie impossible", ok ? "success" : "error");
      }}
      style={{
        display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px",
        borderRadius: "6px", border: "1px solid var(--k-border)", background: "var(--k-surface2)",
        color: "var(--k-muted)", cursor: "pointer", fontSize: "11px", fontWeight: 600,
        fontFamily: "inherit", ...style,
      }}
    >
      ⧉ Copier l'ID
    </button>
  );
}
