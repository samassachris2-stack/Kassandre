import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";

const EVIDENCE_TYPES = [
  { id: "source", label: "Source officielle", icon: "🔗" },
  { id: "sondage", label: "Sondage", icon: "📊" },
  { id: "donnee", label: "Donnée chiffrée", icon: "🧾" },
  { id: "capture", label: "Capture ou document", icon: "📸" },
];
const iconOf = (t) => EVIDENCE_TYPES.find((x) => x.id === t)?.icon || "🔗";
const MAX_ITEMS = 12;

const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "")) ? u : null);

// Preuves et sources d'un marché : sources officielles, sondages, chiffres et
// archives, pour que chaque résolution soit vérifiable. Les admins peuvent les
// modifier directement sur la page du marché.
export default function EvidenceBlock({ market, marketId }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const evidence = Array.isArray(market.evidence) ? market.evidence : [];
  const note = market.resolutionNote || "";
  const empty = evidence.length === 0 && !note;

  if (empty && !user?.isAdmin) return null;

  return (
    <section style={{ marginTop: "28px", textAlign: "left", border: "1px solid var(--k-border)", borderRadius: "12px", padding: "16px", background: "var(--k-surface)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: empty ? 0 : "12px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--k-text)", margin: 0 }}>
          {market.status === "resolved" ? "Preuves de résolution" : "Sources et données de référence"}
        </h3>
        {user?.isAdmin && (
          <button type="button" onClick={() => setEditing((v) => !v)} style={smallBtn}>
            {editing ? "Fermer" : empty ? "Ajouter" : "Modifier"}
          </button>
        )}
      </div>

      {note && (
        <p style={{ fontSize: "14px", color: "var(--k-text2)", lineHeight: 1.55, marginBottom: "12px", whiteSpace: "pre-wrap" }}>{note}</p>
      )}

      {evidence.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
          {evidence.map((e, i) => (
            <li key={i} style={{ display: "flex", gap: "10px", fontSize: "13px", color: "var(--k-muted2)" }}>
              <span aria-hidden="true">{iconOf(e.type)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "var(--k-text)", fontWeight: 600, overflowWrap: "anywhere" }}>
                  {safeUrl(e.url)
                    ? <a href={e.url} target="_blank" rel="noreferrer noopener" style={{ color: "var(--k-accent-text)" }}>{e.label || e.url}</a>
                    : e.label}
                  {e.value && <span style={{ fontWeight: 700 }}> : {e.value}</span>}
                </div>
                <div style={{ color: "var(--k-muted)", fontSize: "12px" }}>
                  {e.date && <span>{e.date}</span>}
                  {safeUrl(e.archiveUrl) && (
                    <>{e.date ? " · " : ""}<a href={e.archiveUrl} target="_blank" rel="noreferrer noopener" style={{ color: "var(--k-muted)" }}>Version archivée</a></>
                  )}
                </div>
                {e.note && <div style={{ color: "var(--k-muted)", fontSize: "12px", marginTop: "2px" }}>{e.note}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && user?.isAdmin && <Editor market={market} marketId={marketId} onDone={() => setEditing(false)} />}
    </section>
  );
}

function Editor({ market, marketId, onDone }) {
  const [items, setItems] = useState(() => (Array.isArray(market.evidence) ? market.evidence.map((e) => ({ ...e })) : []));
  const [note, setNote] = useState(market.resolutionNote || "");
  const [saving, setSaving] = useState(false);

  const patch = (i, p) => setItems((prev) => prev.map((x, k) => (k === i ? { ...x, ...p } : x)));

  async function findArchive(i) {
    const url = safeUrl(items[i]?.url);
    if (!url) { notify("Ajoute d'abord l'URL de la source.", "warning"); return; }
    try {
      const r = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`);
      const j = await r.json();
      const snap = j?.archived_snapshots?.closest;
      if (snap?.available && snap.url) {
        patch(i, { archiveUrl: snap.url.replace(/^http:/, "https:") });
        notify("Archive trouvée.", "success");
      } else {
        notify("Aucune archive. Clique sur « Archiver » puis colle le lien obtenu.", "info");
      }
    } catch {
      notify("Recherche d'archive impossible.", "error");
    }
  }

  async function save() {
    setSaving(true);
    try {
      const clean = items
        .filter((e) => e.label?.trim() || e.url?.trim() || e.value?.trim())
        .map((e) => {
          const out = { type: e.type || "source", label: (e.label || "").trim() };
          ["url", "archiveUrl", "value", "date", "note"].forEach((k) => { if (e[k]?.trim()) out[k] = e[k].trim(); });
          return out;
        });
      await updateDoc(doc(db, "markets", marketId), { evidence: clean, resolutionNote: note.trim() });
      notify("Preuves enregistrées.", "success");
      onDone();
    } catch (e) {
      console.error(e);
      notify("Enregistrement impossible.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: "14px", borderTop: "1px solid var(--k-border)", paddingTop: "14px" }}>
      <label style={lbl}>Note de résolution (comment le résultat a été établi)</label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} />

      {items.map((e, i) => (
        <div key={i} style={{ border: "1px solid var(--k-border)", borderRadius: "8px", padding: "10px", marginTop: "10px", background: "var(--k-inset)" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <select value={e.type || "source"} onChange={(ev) => patch(i, { type: ev.target.value })} style={{ ...inp, flex: "0 0 auto", width: "auto" }}>
              {EVIDENCE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <input placeholder="Titre (ex. Ifop, Insee, communiqué)" value={e.label || ""} onChange={(ev) => patch(i, { label: ev.target.value })} style={inp} />
          </div>
          <input placeholder="Lien de la source (https://...)" value={e.url || ""} onChange={(ev) => patch(i, { url: ev.target.value })} style={{ ...inp, marginBottom: "8px" }} />
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input placeholder="Valeur (ex. 52 %)" value={e.value || ""} onChange={(ev) => patch(i, { value: ev.target.value })} style={inp} />
            <input placeholder="Date (AAAA-MM-JJ)" value={e.date || ""} onChange={(ev) => patch(i, { date: ev.target.value })} style={inp} />
          </div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input placeholder="Lien de l'archive (Wayback...)" value={e.archiveUrl || ""} onChange={(ev) => patch(i, { archiveUrl: ev.target.value })} style={inp} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
            <button type="button" style={smallBtn} onClick={() => findArchive(i)}>Trouver l'archive</button>
            <a
              style={{ ...smallBtn, textDecoration: "none", display: "inline-block" }}
              href={safeUrl(e.url) ? `https://web.archive.org/save/${e.url}` : undefined}
              target="_blank" rel="noreferrer noopener"
              onClick={(ev) => { if (!safeUrl(e.url)) { ev.preventDefault(); notify("Ajoute d'abord l'URL de la source.", "warning"); } }}
            >Archiver</a>
            <button type="button" style={{ ...smallBtn, marginLeft: "auto", color: "#ef4444" }} onClick={() => setItems((p) => p.filter((_, k) => k !== i))}>Retirer</button>
          </div>
          <input placeholder="Note (facultatif)" value={e.note || ""} onChange={(ev) => patch(i, { note: ev.target.value })} style={inp} />
        </div>
      ))}

      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        {items.length < MAX_ITEMS && (
          <button type="button" style={smallBtn} onClick={() => setItems((p) => [...p, { type: "source", label: "" }])}>+ Ajouter une preuve</button>
        )}
        <button type="button" onClick={save} disabled={saving} style={{ ...smallBtn, marginLeft: "auto", background: "var(--k-accent)", color: "#fff", border: "none" }}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: "12px", color: "var(--k-muted)", marginBottom: "4px" };
const inp = {
  width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit",
  border: "1px solid var(--k-border)", background: "var(--k-surface)", color: "var(--k-text)", minWidth: 0,
};
const smallBtn = {
  padding: "5px 11px", borderRadius: "6px", border: "1px solid var(--k-border)", background: "var(--k-surface2)",
  color: "var(--k-text)", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};
