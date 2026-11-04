import { db } from "./firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const articlesCollection = collection(db, "articles");

// ── Lecture publique ──────────────────────────────────────────────────────
// Le blog est lu en priorité par l'API publique (/api/v1/articles, Cloud
// Function avec l'Admin SDK, hors App Check). Un navigateur qui échoue au test
// App Check (poste partagé de BU, réseau d'entreprise...) se voyait refuser la
// lecture Firestore et affichait « Aucun article publié ». Firestore direct ne
// sert plus que de secours (API pas encore déployée, serveur de dev local).

const API = "/api/v1/articles";

async function fromApi(path) {
  const r = await fetch(path, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`api ${r.status}`);
  return r.json();
}

async function publishedFromFirestore(max) {
  const parts = [
    articlesCollection,
    where("status", "==", "published"),
    orderBy("publishedAt", "desc"),
  ];
  if (max) parts.push(limit(max));
  const snapshot = await getDocs(query(...parts));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Articles publiés, du plus récent au plus ancien. Lève une erreur si aucune
// source ne répond (à distinguer d'un blog réellement vide).
export const fetchPublishedArticles = async () => {
  try {
    const body = await fromApi(API);
    if (Array.isArray(body.data)) return body.data;
    throw new Error("api: format inattendu");
  } catch (apiError) {
    console.warn("API articles indisponible, lecture Firestore directe :", apiError.message);
    return publishedFromFirestore();
  }
};

// Version tolérante pour les blocs secondaires (accueil, « À lire aussi ») :
// en cas d'échec, on n'affiche simplement rien.
export const getPublishedArticles = async () => {
  try {
    return await fetchPublishedArticles();
  } catch (error) {
    console.error("Error fetching published articles:", error);
    return [];
  }
};

export const getLatestArticles = async (count = 3) => {
  const all = await getPublishedArticles();
  return all.slice(0, count);
};

// Article publié par son slug. Renvoie null s'il n'existe pas, lève une erreur
// si aucune source ne répond.
export const fetchArticleBySlug = async (slug) => {
  try {
    return await fromApi(`${API}/${encodeURIComponent(slug)}`);
  } catch (apiError) {
    console.warn("API article indisponible, lecture Firestore directe :", apiError.message);
    const q = query(
      articlesCollection,
      where("slug", "==", slug),
      where("status", "==", "published")
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() };
  }
};

export const getArticleBySlug = async (slug) => {
  try {
    return await fetchArticleBySlug(slug);
  } catch (error) {
    console.error("Error fetching article by slug:", error);
    return null;
  }
};

// Get all articles (including drafts) for admin
export const getAllArticles = async () => {
  try {
    const q = query(articlesCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching all articles:", error);
    return [];
  }
};

// Create new article
export const createArticle = async (articleData) => {
  try {
    // Le statut choisi dans le formulaire (brouillon/publié) doit être
    // respecté : il était auparavant écrasé en "draft" systématiquement,
    // ce qui republiait n'importe quel nouvel article en brouillon même
    // si "Publié" était sélectionné dès la création.
    const status = articleData.status || "draft";
    const payload = {
      ...articleData,
      createdAt: serverTimestamp(),
      status,
      linkedMarkets: articleData.linkedMarkets || [],
      tags: articleData.tags || [],
      coverImageUrl: articleData.coverImageUrl || null,
    };
    // Une date choisie à la main (antidatage, reprise d'un ancien texte) est respectée.
    if (!payload.publishedAt) delete payload.publishedAt;
    if (status === "published" && !payload.publishedAt) {
      payload.publishedAt = serverTimestamp();
    }
    const docRef = await addDoc(articlesCollection, payload);
    return docRef.id;
  } catch (error) {
    console.error("Error creating article:", error);
    throw error;
  }
};

// Update article
export const updateArticle = async (articleId, articleData) => {
  try {
    const articleRef = doc(articlesCollection, articleId);
    const updateData = { ...articleData, updatedAt: serverTimestamp() };
    // Pas de date saisie : on garde celle qui existe déjà.
    if (!updateData.publishedAt) delete updateData.publishedAt;
    // La date de publication ne se fixe qu'au premier passage en "published" :
    // la réécrire à chaque enregistrement fausse l'ordre du blog, le flux RSS
    // et la date affichée aux moteurs de recherche.
    if (articleData.status === "published" && !articleData.publishedAt) {
      const existing = await getDoc(articleRef);
      if (!existing.exists() || !existing.data().publishedAt) {
        updateData.publishedAt = serverTimestamp();
      }
    }
    await updateDoc(articleRef, updateData);
  } catch (error) {
    console.error("Error updating article:", error);
    throw error;
  }
};

// Delete article
export const deleteArticle = async (articleId) => {
  try {
    await deleteDoc(doc(articlesCollection, articleId));
  } catch (error) {
    console.error("Error deleting article:", error);
    throw error;
  }
};

// Generate slug from title
export const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};
