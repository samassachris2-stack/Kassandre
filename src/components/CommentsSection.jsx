import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notify, askConfirm } from "../lib/notify";
import {
  MAX_COMMENT_LENGTH, MIN_DELAY_MS, addComment, currentPosition, deleteComment, loadComments, reportComment, targetKey,
} from "../lib/comments";

function ago(ts) {
  const s = ts?.seconds ? Math.max(0, Date.now() / 1000 - ts.seconds) : 0;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 30) return `il y a ${Math.floor(s / 86400)} j`;
  return new Date(ts.seconds * 1000).toLocaleDateString("fr-FR");
}

function SideBadge({ side }) {
  if (!side) return null;
  const color = side === "OUI" ? "#22c55e" : side === "NON" ? "#ef4444" : "var(--k-accent-text)";
  return (
    <span style={{ fontSize: "10px", fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: "4px", padding: "1px 6px" }}>
      {side}
    </span>
  );
}

function Form({ onSubmit, placeholder, autoFocus, onCancel }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const left = MAX_COMMENT_LENGTH - text.length;
  async function send(e) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    const ok = await onSubmit(text);
    setBusy(false);
    if (ok) setText("");
  }
  return (
    <form onSubmit={send} style={{ textAlign: "left" }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={3}
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", resize: "vertical",
          border: "1px solid var(--k-border)", background: "var(--k-inset)", color: "var(--k-text)", fontSize: "14px", fontFamily: "inherit",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
        <span style={{ fontSize: "11px", color: left < 50 ? "#ef4444" : "var(--k-faint)" }}>{left} caractères restants</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={ghostBtn}>Annuler</button>
          )}
          <button
            type="submit"
            disabled={busy || !text.trim()}
            style={{ ...primaryBtn, opacity: busy || !text.trim() ? 0.5 : 1 }}
          >
            {busy ? "Envoi..." : "Publier"}
          </button>
        </span>
      </div>
    </form>
  );
}

function Comment({ c, user, isReply, onReply, onDelete, onReport }) {
  const mine = user?.uid === c.userId;
  const canDelete = mine || user?.isAdmin;
  return (
    <div style={{ display: "flex", gap: "10px", textAlign: "left" }}>
      {c.avatarUrl
        ? <img src={c.avatarUrl} alt="" width={isReply ? 26 : 32} height={isReply ? 26 : 32} referrerPolicy="no-referrer" style={{ borderRadius: "50%", flexShrink: 0, objectFit: "cover" }} />
        : <div style={{ width: isReply ? 26 : 32, height: isReply ? 26 : 32, borderRadius: "50%", background: "var(--k-surface2)", flexShrink: 0 }} />}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "3px" }}>
          <Link to={`/profil/${c.userId}`} style={{ fontSize: "13px", fontWeight: 700, color: "var(--k-text)", textDecoration: "none" }}>{c.pseudo}</Link>
          <SideBadge side={c.side} />
          <span style={{ fontSize: "11px", color: "var(--k-faint)" }}>{ago(c.createdAt)}</span>
        </div>
        <p style={{ fontSize: "14px", color: "var(--k-text2)", lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{c.text}</p>
        <div style={{ display: "flex", gap: "14px", marginTop: "5px" }}>
          {!isReply && user && <button type="button" onClick={() => onReply(c)} style={linkBtn}>Répondre</button>}
          {canDelete && <button type="button" onClick={() => onDelete(c)} style={linkBtn}>Supprimer</button>}
          {!mine && user && <button type="button" onClick={() => onReport(c)} style={linkBtn}>Signaler</button>}
        </div>
      </div>
    </div>
  );
}

// Commentaires sous un marché (type "market") ou un article (type "article").
export default function CommentsSection({ type, id, options }) {
  const { user, login } = useAuth();
  const key = targetKey(type, id);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const lastPost = useRef(0);
  const [shown, setShown] = useState(20);

  useEffect(() => {
    let alive = true;
    loadComments(key)
      .then((r) => { if (alive) setItems(r); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [key]);

  async function submit(text, parentId) {
    if (Date.now() - lastPost.current < MIN_DELAY_MS) {
      notify("Patiente quelques secondes avant de poster à nouveau.", "warning");
      return false;
    }
    try {
      const side = type === "market" ? await currentPosition(user.uid, id, options) : null;
      const c = await addComment({ key, user, text, side, parentId });
      lastPost.current = Date.now();
      setItems((prev) => [c, ...(prev || [])]);
      setReplyTo(null);
      return true;
    } catch (e) {
      console.error("commentaire non publié", e);
      notify("Impossible de publier le commentaire.", "error");
      return false;
    }
  }

  async function remove(c) {
    if (!(await askConfirm("Supprimer ce commentaire ?", { confirmLabel: "Supprimer", danger: true }))) return;
    try {
      await deleteComment(c.id);
      setItems((prev) => prev.filter((x) => x.id !== c.id && x.parentId !== c.id));
    } catch {
      notify("Suppression impossible.", "error");
    }
  }

  async function report(c) {
    if (!(await askConfirm("Signaler ce commentaire à la modération ?", { confirmLabel: "Signaler" }))) return;
    try {
      await reportComment(c.id, user.uid);
      notify("Merci, le commentaire a été signalé.", "success");
    } catch {
      notify("Tu as déjà signalé ce commentaire.", "info");
    }
  }

  const top = (items || []).filter((c) => !c.parentId);
  const repliesOf = (pid) => (items || []).filter((c) => c.parentId === pid).reverse();

  return (
    <section style={{ borderTop: "1px solid var(--k-border)", paddingTop: "22px", marginTop: "28px", textAlign: "left" }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--k-text)", margin: "0 0 14px" }}>
        Commentaires{items ? ` (${items.length})` : ""}
      </h3>

      {user ? (
        <Form
          onSubmit={(t) => submit(t, null)}
          placeholder={type === "market" ? "Explique ton pronostic, apporte une source..." : "Ton avis sur cet article..."}
        />
      ) : (
        <button type="button" onClick={login} style={{ ...primaryBtn, padding: "10px 16px" }}>
          Connecte-toi pour commenter
        </button>
      )}

      <p style={{ fontSize: "11px", color: "var(--k-faint)", margin: "8px 0 18px" }}>
        Reste respectueux : insultes, haine et spam sont supprimés.
      </p>

      {error && <p style={{ fontSize: "13px", color: "var(--k-muted)" }}>Les commentaires sont indisponibles pour le moment.</p>}
      {!items && !error && <p style={{ fontSize: "13px", color: "var(--k-muted)" }}>Chargement...</p>}
      {items && top.length === 0 && (
        <p style={{ fontSize: "13px", color: "var(--k-muted)" }}>Aucun commentaire pour l'instant. Lance la discussion.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {top.slice(0, shown).map((c) => (
          <div key={c.id}>
            <Comment c={c} user={user} onReply={setReplyTo} onDelete={remove} onReport={report} />
            {(repliesOf(c.id).length > 0 || replyTo?.id === c.id) && (
              <div style={{ marginLeft: "42px", marginTop: "12px", paddingLeft: "12px", borderLeft: "2px solid var(--k-border)", display: "flex", flexDirection: "column", gap: "12px" }}>
                {repliesOf(c.id).map((r) => (
                  <Comment key={r.id} c={r} user={user} isReply onReply={() => {}} onDelete={remove} onReport={report} />
                ))}
                {replyTo?.id === c.id && (
                  <Form
                    autoFocus
                    placeholder={`Répondre à ${c.pseudo}...`}
                    onSubmit={(t) => submit(t, c.id)}
                    onCancel={() => setReplyTo(null)}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {top.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + 20)} style={{ ...ghostBtn, marginTop: "16px" }}>
          Voir plus de commentaires
        </button>
      )}
    </section>
  );
}

const primaryBtn = {
  padding: "8px 16px", borderRadius: "8px", border: "none", background: "var(--k-accent)", color: "#fff",
  fontWeight: 600, fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
};
const ghostBtn = {
  padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--k-border)", background: "transparent",
  color: "var(--k-muted2)", fontWeight: 600, fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
};
const linkBtn = {
  background: "none", border: "none", padding: 0, color: "var(--k-muted)", fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
};
