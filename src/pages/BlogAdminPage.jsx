import { prepareImageForUpload } from "../lib/imageUtils";
import { externalizeDataImages } from "../lib/blogImages";
import { safeFileName } from "../lib/cssUrl";
import { useState, useEffect, useRef } from "react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import BlogEditor from "../components/BlogEditor";
import BlogCSVImport from "../components/BlogCSVImport";
import MarketPicker from "../components/MarketPicker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";
import {
  getAllArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  generateSlug,
} from "../lib/articles";
import { notify, askConfirm } from "../lib/notify";

// Date d'un article (Timestamp Firestore) au format attendu par <input type="datetime-local">.
function toLocalInput(ts) {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BlogAdminPage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    tags: "",
    linkedMarkets: "",
    status: "draft",
    coverImageUrl: "",
    publishedAt: "",
  });

  useEffect(() => {
    if (!user || !user.isAdmin) return;
    loadArticles();
  }, [user]);

  const loadArticles = async () => {
    setLoading(true);
    const data = await getAllArticles();
    setArticles(data);
    setLoading(false);
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let content = formData.content;
    try {
      content = await externalizeDataImages(content);
    } catch (err) {
      console.error("Images non envoyées:", err);
      notify("Impossible d'envoyer les images collées : " + (err.code || err.message), "error");
      return;
    }

    const articleData = {
      title: formData.title,
      slug: formData.slug,
      excerpt: formData.excerpt,
      content,
      tags: formData.tags.split(",").map((tag) => tag.trim()).filter(t => t),
      linkedMarkets: formData.linkedMarkets
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id)
        .slice(0, 3),
      status: formData.status,
      coverImageUrl: formData.coverImageUrl || null,
    };
    if (formData.publishedAt) {
      const d = new Date(formData.publishedAt);
      if (!Number.isNaN(d.getTime())) articleData.publishedAt = Timestamp.fromDate(d);
    }

    try {
      if (editingId) {
        await updateArticle(editingId, articleData);
      } else {
        await createArticle(articleData);
      }

      resetForm();
      await loadArticles();
    } catch (error) {
      console.error("Error saving article:", error);
      notify("Erreur lors de l'enregistrement : " + (error.code || error.message), "error");
    }
  };

  const handleEdit = (article) => {
    setFormData({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      tags: article.tags ? article.tags.join(", ") : "",
      linkedMarkets: article.linkedMarkets ? article.linkedMarkets.join(", ") : "",
      status: article.status,
      coverImageUrl: article.coverImageUrl || "",
      publishedAt: toLocalInput(article.publishedAt || article.createdAt),
    });
    setEditingId(article.id);
    setShowForm(true);
    setPreviewMode(false);
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const blob = await prepareImageForUpload(file);
      const base = safeFileName(file.name).replace(/\.[^.]+$/, "");
      const path = `blog-covers/${Date.now()}_${base}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      setFormData((prev) => ({ ...prev, coverImageUrl: url }));
    } catch (error) {
      console.error("Error uploading cover:", error);
      notify(
        error.message === "IMAGE_UNREADABLE"
          ? "Image illisible par le navigateur. Ouvre-la dans Paint ou Photos, enregistre-la en JPEG, puis réessaie."
          : "Erreur lors de l'upload de l'image de couverture",
        "error"
      );
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    if (!(await askConfirm("Êtes-vous sûr?", { confirmLabel: "Supprimer", danger: true }))) return;
    try {
      await deleteArticle(id);
      await loadArticles();
    } catch (error) {
      console.error("Error deleting:", error);
      notify("Erreur", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      tags: "",
      linkedMarkets: "",
      status: "draft",
      coverImageUrl: "",
      publishedAt: "",
    });
    setEditingId(null);
    setShowForm(false);
    setPreviewMode(false);
  };

  if (!user || !user.isAdmin) {
    return <div style={styles.container}>Accès refusé</div>;
  }

  return (
    <div style={styles.container}>
      <style>{`
        @media (max-width: 640px) {
          .blog-admin-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={styles.header}>
        <h1 style={styles.title}>Gestion du Blog</h1>
        <button type="button" onClick={() => (showForm ? resetForm() : setShowForm(true))} style={styles.newButton}>
          {showForm ? "Annuler" : "Nouvel article"}
        </button>
      </div>

      <BlogCSVImport onImportComplete={loadArticles} />

      {showForm && (
        <div style={styles.formContainer}>
          <div style={styles.formTabs}>
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              style={{
                ...styles.tabButton,
                backgroundColor: !previewMode ? "var(--k-accent)" : "var(--k-surface2)",
              }}
            >
              Édition
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              style={{
                ...styles.tabButton,
                backgroundColor: previewMode ? "var(--k-accent)" : "var(--k-surface2)",
              }}
            >
              Aperçu
            </button>
          </div>

          {!previewMode ? (
            <form onSubmit={handleSubmit} style={styles.form}>
              <div className="blog-admin-row" style={styles.row}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Titre</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={handleTitleChange}
                    required
                    style={styles.input}
                    placeholder="Titre de l'article"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                    style={styles.input}
                    placeholder="slug-url"
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Résumé (excerpt)</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  style={{ ...styles.input, minHeight: "60px" }}
                  placeholder="Court résumé pour la liste"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Image de couverture</label>
                {formData.coverImageUrl ? (
                  <div style={styles.coverPreviewWrap}>
                    <img
                      src={formData.coverImageUrl}
                      alt="Couverture"
                      style={styles.coverPreviewImg}
                    />
                    <div style={styles.coverPreviewActions}>
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        style={styles.coverChangeButton}
                        disabled={uploadingCover}
                      >
                        {uploadingCover ? "Envoi..." : "Changer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, coverImageUrl: "" })}
                        style={styles.coverRemoveButton}
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    style={styles.coverUploadButton}
                    disabled={uploadingCover}
                  >
                    {uploadingCover ? "Envoi en cours..." : "+ Ajouter une image de couverture"}
                  </button>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  style={{ display: "none" }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Contenu</label>
                <BlogEditor
                  content={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                />
              </div>

              <div className="blog-admin-row" style={styles.row}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tags</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    style={styles.input}
                    placeholder="actualité, analyse, tutoriel"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={styles.input}
                  >
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Date de publication</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="datetime-local"
                    value={formData.publishedAt}
                    onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                    style={{ ...styles.input, flex: "0 1 260px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, publishedAt: "" })}
                    style={{ background: "transparent", border: "1px solid var(--k-border)", color: "var(--k-muted2)", borderRadius: "6px", padding: "10px 14px", cursor: "pointer" }}
                  >
                    Effacer
                  </button>
                </div>
                <span style={{ fontSize: "0.82rem", color: "var(--k-muted)" }}>
                  Date affichée sur le blog, dans le flux RSS et pour Google, et qui sert à ranger les articles. Laisse vide pour utiliser la date de la première publication.
                </span>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Marchés liés (3 maximum)</label>
                <MarketPicker
                  value={formData.linkedMarkets}
                  onChange={(v) => setFormData({ ...formData, linkedMarkets: v })}
                />
              </div>

              <div style={styles.formActions}>
                <button type="submit" style={styles.submitButton}>
                  {editingId ? "Mettre à jour" : "Créer"} l'article
                </button>
                <button type="button" onClick={resetForm} style={styles.cancelButton}>
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <div style={styles.preview}>
              <style>{`
                .blog-preview-body h2 { font-size: 1.6rem; font-weight: 700; color: var(--k-text); margin: 28px 0 14px 0; }
                .blog-preview-body h3 { font-size: 1.3rem; font-weight: 700; color: var(--k-text); margin: 24px 0 12px 0; }
                .blog-preview-body p { margin: 0 0 16px 0; }
                .blog-preview-body ul, .blog-preview-body ol { padding-left: 24px; margin: 0 0 16px 0; }
                .blog-preview-body strong { color: var(--k-text); font-weight: 700; }
                .blog-preview-body u { text-decoration: underline; }
                .blog-preview-body a { color: var(--k-accent-text); text-decoration: underline; }
                .blog-preview-body blockquote { border-left: 3px solid var(--k-accent); margin: 20px 0; padding: 4px 20px; color: var(--k-muted2); font-style: italic; }
                .blog-preview-body pre { background: var(--k-bg); border: 1px solid var(--k-border); border-radius: 6px; padding: 14px 18px; overflow-x: auto; margin: 20px 0; }
                .blog-preview-body code { background: var(--k-bg); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
                .blog-preview-body hr { border: none; border-top: 1px solid var(--k-border); margin: 28px 0; }
                .blog-preview-body img { max-width: 100%; border-radius: 8px; }
                .blog-preview-body img:not([width]) { width: min(640px, 100%); }
                .blog-preview-body img[data-align="left"] { float: left; margin: 4px 20px 12px 0; }
                .blog-preview-body img[data-align="right"] { float: right; margin: 4px 0 12px 20px; }
                .blog-preview-body img[data-align="center"] { display: block; margin: 20px auto; }
                .blog-preview-body img:not([data-align]) { display: block; margin: 20px 0; }
                .blog-preview-body::after { content: ''; display: table; clear: both; }
              `}</style>
              {formData.coverImageUrl && (
                <img
                  src={formData.coverImageUrl}
                  alt=""
                  style={styles.previewCover}
                />
              )}
              <h2 style={styles.previewTitle}>{formData.title}</h2>
              <p style={styles.previewExcerpt}>{formData.excerpt}</p>
              <div
                className="blog-preview-body"
                style={styles.previewContent}
                dangerouslySetInnerHTML={{ __html: formData.content }}
              />
            </div>
          )}
        </div>
      )}

      <div style={styles.articlesSection}>
        <h2 style={styles.subtitle}>Articles ({articles.length})</h2>

        {loading && <p style={styles.loading}>Chargement...</p>}

        {!loading && articles.length === 0 && (
          <p style={styles.empty}>Aucun article</p>
        )}

        {!loading && articles.length > 0 && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Titre</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} style={styles.tr}>
                    <td style={styles.td}>{article.title}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.status,
                          backgroundColor:
                            article.status === "published"
                              ? "rgba(var(--k-accent-rgb), 0.2)"
                              : "rgba(160, 160, 176, 0.2)",
                          color:
                            article.status === "published"
                              ? "var(--k-accent)"
                              : "var(--k-muted2)",
                        }}
                      >
                        {article.status === "published" ? "Publié" : "Brouillon"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          type="button"
                          onClick={() => handleEdit(article)}
                          style={styles.actionButton}
                        >
                          Éditer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(article.id)}
                          style={styles.deleteButton}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 20px",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "40px",
    flexWrap: "wrap",
    gap: "12px",
  },
  title: {
    fontSize: "2rem",
    color: "var(--k-text)",
    margin: 0,
  },
  newButton: {
    padding: "12px 24px",
    backgroundColor: "var(--k-accent)",
    color: "var(--k-text)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
  },
  formContainer: {
    backgroundColor: "var(--k-surface2)",
    border: "1px solid var(--k-border)",
    borderRadius: "12px",
    marginBottom: "40px",
    overflow: "clip",
  },
  formTabs: {
    display: "flex",
    gap: "8px",
    padding: "16px",
    borderBottom: "1px solid var(--k-border)",
    backgroundColor: "var(--k-bg)",
  },
  tabButton: {
    padding: "10px 20px",
    backgroundColor: "var(--k-surface2)",
    color: "var(--k-text)",
    border: "1px solid var(--k-border)",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  form: {
    padding: "24px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    color: "var(--k-text)",
    fontWeight: "600",
    fontSize: "0.95rem",
  },
  input: {
    padding: "12px",
    backgroundColor: "var(--k-bg)",
    color: "var(--k-text)",
    border: "1px solid var(--k-border)",
    borderRadius: "6px",
    fontSize: "1rem",
    fontFamily: "inherit",
  },
  coverUploadButton: {
    padding: "14px",
    backgroundColor: "var(--k-bg)",
    color: "var(--k-muted2)",
    border: "1px dashed var(--k-border2)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: "500",
    textAlign: "center",
  },
  coverPreviewWrap: {
    position: "relative",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid var(--k-border)",
  },
  coverPreviewImg: {
    display: "block",
    width: "100%",
    maxHeight: "260px",
    objectFit: "cover",
  },
  coverPreviewActions: {
    display: "flex",
    gap: "8px",
    padding: "10px",
    backgroundColor: "var(--k-bg)",
  },
  coverChangeButton: {
    padding: "8px 16px",
    backgroundColor: "var(--k-accent)",
    color: "var(--k-text)",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "0.9rem",
  },
  coverRemoveButton: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "var(--k-red-text)",
    border: "1px solid var(--k-red-bg)",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "0.9rem",
  },
  previewCover: {
    display: "block",
    width: "100%",
    maxHeight: "320px",
    objectFit: "cover",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  formActions: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
  },
  submitButton: {
    flex: 1,
    padding: "12px 24px",
    backgroundColor: "var(--k-accent)",
    color: "var(--k-text)",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
  },
  cancelButton: {
    padding: "12px 24px",
    backgroundColor: "var(--k-border)",
    color: "var(--k-text)",
    border: "1px solid var(--k-border2)",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
  preview: {
    padding: "40px",
    backgroundColor: "var(--k-bg)",
  },
  previewTitle: {
    fontSize: "2rem",
    color: "var(--k-text)",
    marginBottom: "16px",
  },
  previewExcerpt: {
    fontSize: "1.1rem",
    color: "var(--k-muted2)",
    fontStyle: "italic",
    marginBottom: "24px",
  },
  previewContent: {
    color: "var(--k-text)",
    lineHeight: "1.8",
    fontSize: "1.05rem",
  },
  articlesSection: {
    backgroundColor: "var(--k-surface2)",
    border: "1px solid var(--k-border)",
    borderRadius: "12px",
    padding: "24px",
  },
  subtitle: {
    fontSize: "1.3rem",
    color: "var(--k-text)",
    margin: "0 0 20px 0",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    color: "var(--k-text)",
    fontWeight: "600",
    borderBottom: "1px solid var(--k-border)",
    backgroundColor: "var(--k-bg)",
  },
  tr: {
    borderBottom: "1px solid var(--k-border)",
  },
  td: {
    padding: "12px",
    color: "var(--k-text)",
  },
  status: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "4px",
    fontSize: "0.85rem",
    fontWeight: "500",
  },
  actions: {
    display: "flex",
    gap: "8px",
  },
  actionButton: {
    padding: "6px 12px",
    backgroundColor: "var(--k-accent)",
    color: "var(--k-text)",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  deleteButton: {
    padding: "6px 12px",
    backgroundColor: "var(--k-red-bg)",
    color: "var(--k-red-text)",
    border: "1px solid var(--k-red-border)",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  loading: {
    color: "var(--k-muted2)",
    textAlign: "center",
    padding: "20px",
  },
  empty: {
    color: "var(--k-muted2)",
    textAlign: "center",
    padding: "20px",
  },
};
