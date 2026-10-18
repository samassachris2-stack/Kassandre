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
    let options = [];
    if (m.type === "multi") {
      // Options publiques d'un marché à choix multiples, triées par probabilité
      const optSnap = await db.collection("markets").doc(id).collection("options").get();
      options = optSnap.docs
        .map((d) => d.data())
        .filter((o) => o.label)
        .map((o) => ({ label: String(o.label), price: typeof o.price === "number" ? o.price : null }))
        .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
        .slice(0, 10);
    }
    const cats = Array.isArray(m.categories) ? m.categories : m.category ? [m.category] : [];
    return {
      question: m.question ?? "",
      description: m.description ?? "",
      category: cats.length > 0 ? String(cats[0]) : null,
      type: m.type ?? null,
      status: m.status ?? null,
      resolutionDate: typeof m.resolutionDate === "string" ? m.resolutionDate : iso(m.resolutionDate)?.slice(0, 10) ?? null,
      poolYes: typeof m.poolYes === "number" ? m.poolYes : null,
      poolNo: typeof m.poolNo === "number" ? m.poolNo : null,
      options,
    };
  }

  return null;
}

// Listes pour les sitemaps (api/sitemap.js). Requêtes à un seul filtre
// d'égalité, tri en JS : aucun index Firestore composite requis.
const MAX_URLS = 1000;
const day = (ts) => (iso(ts) || "").slice(0, 10) || null;
const newestFirst = (a, b) => (b.lastmod || "").localeCompare(a.lastmod || "");

export async function buildIndexPayload(db, kind) {
  if (kind === "articles-index") {
    const snap = await db.collection("articles").where("status", "==", "published").limit(MAX_URLS).get();
    const items = snap.docs
      .map((d) => d.data())
      .filter((a) => a.slug)
      .map((a) => ({
        slug: a.slug,
        lastmod: day(a.updatedAt) || day(a.publishedAt) || day(a.createdAt),
        // champs supplémentaires pour le flux RSS (api/rss.js)
        title: a.title ?? "",
        excerpt: a.excerpt ?? "",
        publishedAt: iso(a.publishedAt) || iso(a.createdAt),
      }))
      .sort(newestFirst);
    return { items };
  }

  if (kind === "markets-index") {
    const snap = await db.collection("markets").where("status", "==", "open").limit(MAX_URLS).get();
    const items = snap.docs
      .map((d) => ({ id: d.id, lastmod: day(d.data().createdAt) }))
      .sort(newestFirst);
    return { items };
  }

  return null;
}
