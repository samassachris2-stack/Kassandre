import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { notify } from "../lib/notify";
import { deleteComment, dismissReports, loadReports } from "../lib/comments";

// File de modération : commentaires signalés (réservée aux admins).
export default function ReportedComments() {
  const [groups, setGroups] = useState(null);

  useEffect(() => {
    let alive = true;
    loadReports().then((g) => { if (alive) setGroups(g); }).catch(() => { if (alive) setGroups([]); });
    return () => { alive = false; };
  }, []);

  async function remove(g) {
    try {
      if (g.comment) await deleteComment(g.comment.id);
      await dismissReports(g);
      setGroups((prev) => prev.filter((x) => x.commentId !== g.commentId));
      notify("Commentaire supprimé.", "success");
    } catch { notify("Action impossible.", "error"); }
  }
  async function ignore(g) {
    try {
      await dismissReports(g);
      setGroups((prev) => prev.filter((x) => x.commentId !== g.commentId));
    } catch { notify("Action impossible.", "error"); }
  }

  const link = (c) => {
    const [type, ...rest] = String(c.targetKey).split(":");
    const id = rest.join(":");
    return type === "market" ? `/market/${id}` : `/blog/${id}`;
  };

  return (
    <details style={{ marginBottom: "24px", background: "var(--k-surface2)", border: "1px solid var(--k-border)", borderRadius: "8px", padding: "12px" }}>
      <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--k-text)" }}>
        Commentaires signalés{groups ? ` (${groups.length})` : ""}
      </summary>
      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
        {!groups && <p style={{ color: "var(--k-muted)", fontSize: "13px" }}>Chargement...</p>}
        {groups && groups.length === 0 && <p style={{ color: "var(--k-muted)", fontSize: "13px" }}>Aucun signalement.</p>}
        {groups && groups.map((g) => (
          <div key={g.commentId} style={{ border: "1px solid var(--k-border)", borderRadius: "8px", padding: "10px", background: "var(--k-surface)" }}>
            {g.comment ? (
              <>
                <p style={{ fontSize: "12px", color: "var(--k-muted)", marginBottom: "4px" }}>
                  {g.comment.pseudo} · {g.reports.length} signalement{g.reports.length > 1 ? "s" : ""} ·{" "}
                  <Link to={link(g.comment)} style={{ color: "var(--k-accent-text)" }}>voir la page</Link>
                </p>
                <p style={{ fontSize: "14px", color: "var(--k-text)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{g.comment.text}</p>
              </>
            ) : (
              <p style={{ fontSize: "13px", color: "var(--k-muted)" }}>Commentaire déjà supprimé.</p>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button type="button" onClick={() => remove(g)} style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#ef4444", color: "#fff", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                {g.comment ? "Supprimer le commentaire" : "Nettoyer"}
              </button>
              {g.comment && (
                <button type="button" onClick={() => ignore(g)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--k-border)", background: "transparent", color: "var(--k-muted2)", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                  Ignorer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
