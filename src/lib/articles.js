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

// Get all published articles, sorted by publishedAt descending
export const getPublishedArticles = async () => {
  try {
    const q = query(
      articlesCollection,
      where("status", "==", "published"),
      orderBy("publishedAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching published articles:", error);
    return [];
  }
};

// Get the N most recent published articles (homepage preview)
export const getLatestArticles = async (count = 3) => {
  try {
    const q = query(
      articlesCollection,
      where("status", "==", "published"),
      orderBy("publishedAt", "desc"),
      limit(count)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching latest articles:", error);
    return [];
  }
};

// Get article by slug
export const getArticleBySlug = async (slug) => {
  try {
    const q = query(
      articlesCollection,
      where("slug", "==", slug),
      where("status", "==", "published")
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
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
    if (status === "published") {
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
    const updateData = { ...articleData };
    if (articleData.status === "published" && !articleData.publishedAt) {
      updateData.publishedAt = serverTimestamp();
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
