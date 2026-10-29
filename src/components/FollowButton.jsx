import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";

// Bouton « Suivre » : le document follows/{uid}_{marketId} existe tant que le
// membre suit le marché. Les Cloud Functions s'en servent pour envoyer les alertes.
export default function FollowButton({ marketId }) {
  const { user, login } = useAuth();
  const uid = user?.uid;
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "follows", `${uid}_${marketId}`);
    return onSnapshot(ref, (snap) => setFollowing(snap.exists()), () => {});
  }, [uid, marketId]);

  async function toggle() {
    if (!uid) return login();
    setBusy(true);
    try {
      const ref = doc(db, "follows", `${uid}_${marketId}`);
      if (following) {
        await deleteDoc(ref);
        notify("Vous ne suivez plus ce marché.", "info");
      } else {
        await setDoc(ref, { userId: uid, marketId, createdAt: serverTimestamp() });
        notify("Marché suivi. Vous serez alerté en cas de gros mouvement ou de résolution.", "success");
      }
    } catch {
      notify("Impossible de modifier le suivi pour le moment.", "error");
    } finally {
      setBusy(false);
    }
  }

  const on = uid && following;
  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={!!on}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        background: on ? "rgba(var(--k-accent-rgb),0.25)" : "rgba(var(--k-accent-rgb),0.1)",
        border: "0.5px solid rgba(var(--k-accent-rgb),0.3)",
        color: "var(--k-accent-text)", borderRadius: "8px", padding: "6px 12px",
        fontSize: "13px", fontWeight: "500", cursor: "pointer",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {on ? "Suivi" : "Suivre"}
    </button>
  );
}
