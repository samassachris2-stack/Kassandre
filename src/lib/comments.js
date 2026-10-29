import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where,
} from "firebase/firestore";
import { db } from "./firebase";

export const MAX_COMMENT_LENGTH = 500;
export const MIN_DELAY_MS = 20000; // pause entre deux commentaires d'un même utilisateur

export const targetKey = (type, id) => `${type}:${id}`;

// Commentaires d'une cible, du plus récent au plus ancien (tri côté navigateur,
// ce qui évite un index Firestore). 200 au maximum.
export async function loadComments(key) {
  const snap = await getDocs(query(collection(db, "comments"), where("targetKey", "==", key), limit(200)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

// Position de l'utilisateur sur un marché : "OUI", "NON" ou le libellé de l'option
// qu'il détient le plus. null s'il n'a rien (ou plus rien).
export async function currentPosition(uid, marketId, options) {
  try {
    const snap = await getDocs(query(collection(db, "bets"), where("userId", "==", uid), where("marketId", "==", marketId)));
    const net = {};
    snap.docs.forEach((d) => {
      const b = d.data();
      const k = b.optionId || b.side;
      if (k) net[k] = (net[k] || 0) + (b.shares || 0);
    });
    const top = Object.entries(net).filter(([, v]) => v > 0.001).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    if (top[0] === "yes") return "OUI";
    if (top[0] === "no") return "NON";
    return (options || []).find((o) => o.id === top[0])?.label || null;
  } catch {
    return null;
  }
}

export async function addComment({ key, user, text, side, parentId }) {
  const data = {
    targetKey: key,
    userId: user.uid,
    pseudo: String(user.pseudo || user.displayName || "Anonyme").slice(0, 40),
    avatarUrl: user.avatarUrl || user.photoURL || null,
    text: text.trim().slice(0, MAX_COMMENT_LENGTH),
    side: side || null,
    parentId: parentId || null,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "comments"), data);
  const snap = await getDoc(ref);
  return { id: ref.id, ...snap.data() };
}

export const deleteComment = (id) => deleteDoc(doc(db, "comments", id));

export async function reportComment(commentId, uid, reason = "") {
  await setDoc(doc(db, "reports", `${commentId}_${uid}`), {
    commentId, userId: uid, reason: reason.slice(0, 200), createdAt: serverTimestamp(),
  });
}

// Signalements en attente, avec le commentaire concerné (administrateurs).
export async function loadReports() {
  const snap = await getDocs(query(collection(db, "reports"), limit(100)));
  const byComment = new Map();
  snap.docs.forEach((d) => {
    const r = { id: d.id, ...d.data() };
    const g = byComment.get(r.commentId) || { commentId: r.commentId, reports: [] };
    g.reports.push(r);
    byComment.set(r.commentId, g);
  });
  const out = [];
  for (const g of byComment.values()) {
    const c = await getDoc(doc(db, "comments", g.commentId));
    out.push({ ...g, comment: c.exists() ? { id: c.id, ...c.data() } : null });
  }
  return out;
}

export async function dismissReports(group) {
  await Promise.all(group.reports.map((r) => deleteDoc(doc(db, "reports", r.id))));
}
