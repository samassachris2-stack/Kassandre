// Données PUBLIQUES minimales pour les aperçus de liens (voir api/og.js côté
// Vercel). Lues avec l'Admin SDK : pas de règles Firestore ni d'App Check, donc
// on ne renvoie ici que ce qui est déjà visible par n'importe quel visiteur du
// site (articles au statut "published", fiche publique d'un marché).
// Jamais de brouillon, jamais de données utilisateur.

export const ID_RE = /^[\p{L}\p{N}_-]{1,200}$/u;

const iso = (ts) => (ts && typeof ts.toDate === "function" ? ts.toDate().toISOString() : null);

export async function buildOgPayload(db, kind, id) {
  if (kind === "article") {
    const snap = await db
      .collection("articles")
      .where("slug", "==", id)
      .where("status", "==", "published")
      .limit(1)
      .get();
    if (snap.empty) return null;
    const a = snap.docs[0].data();
    return {
      title: a.title ?? "",
      slug: a.slug ?? id,
      excerpt: a.excerpt ?? "",
      content: a.content ?? "",
      coverImageUrl: a.coverImageUrl ?? null,
      publishedAt: iso(a.publishedAt),
      tags: Array.isArray(a.tags) ? a.tags : [],
    };
  }

  if (kind === "market") {
    const snap = await db.collection("markets").doc(id).get();
    if (!snap.exists) return null;
    const m = snap.data();
    return {
      question: m.question ?? "",
      description: m.description ?? "",
      type: m.type ?? null,
      poolYes: typeof m.poolYes === "number" ? m.poolYes : null,
      poolNo: typeof m.poolNo === "number" ? m.poolNo : null,
    };
  }

  return null;
}
