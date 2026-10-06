import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import BlogEditor from "../components/BlogEditor";
import BlogCSVImport from "../components/BlogCSVImport";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";
import {
  getAllArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  generateSlug,
} from "../lib/articles";

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

    const articleData = {
      title: formData.title,
      slug: formData.slug,
      excerpt: formData.excerpt,
      content: formData.content,
      tags: formData.tags.split(",").map((tag) => tag.trim()).filter(t => t),
      linkedMarkets: formData.linkedMarkets
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id),
      status: formData.status,
      coverImageUrl: formData.coverImageUrl || null,
    };

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
      alert("Erreur lors de l'enregistrement");
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
      const path = `blog-covers/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData((prev) => ({ ...prev, coverImageUrl: url }));
    } catch (error) {
      console.error("Error uploading cover:", error);
      alert("Erreur lors de l'upload de l'image de couverture");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr?")) return;
    try {
      await deleteArticle(id);
      await loadArticles();
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Erreur");
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
                backgroundColor: !previewMode ? "#7c3aed" : "#1a1a22",
              }}
            >
              Édition
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              style={{
                ...styles.tabButton,
                backgroundColor: previewMode ? "#7c3aed" : "#1a1a22",
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
                <label style={styles.label}>Market IDs</label>
                <input
                  type="text"
                  value={formData.linkedMarkets}
                  onChange={(e) => setFormData({ ...formData, linkedMarkets: e.target.value })}
                  style={styles.input}
                  placeholder="market-id-1, market-id-2"
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
                .blog-preview-body h2 { font-size: 1.6rem; font-weight: 700; color: #e8e8f0; margin: 28px 0 14px 0; }
                .blog-preview-body h3 { font-size: 1.3rem; font-weight: 700; color: #e8e8f0; margin: 24px 0 12px 0; }
                .blog-preview-body p { margin: 0 0 16px 0; }
                .blog-preview-body ul, .blog-preview-body ol { padding-left: 24px; margin: 0 0 16px 0; }
                .blog-preview-body strong { color: #e8e8f0; font-weight: 700; }
                .blog-preview-body u { text-decoration: underline; }
                .blog-preview-body a { color: #a78bfa; text-decoration: underline; }
                .blog-preview-body blockquote { border-left: 3px solid #7c3aed; margin: 20px 0; padding: 4px 20px; color: #a0a0b0; font-style: italic; }
                .blog-preview-body pre { background: #0a0a0f; border: 1px solid #2a2a35; border-radius: 6px; padding: 14px 18px; overflow-x: auto; margin: 20px 0; }
                .blog-preview-body code { background: #0a0a0f; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
                .blog-preview-body hr { border: none; border-top: 1px solid #2a2a35; margin: 28px 0; }
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
                              ? "rgba(124, 58, 237, 0.2)"
                              : "rgba(160, 160, 176, 0.2)",
                          color:
                            article.status === "published"
                              ? "#7c3aed"
                              : "#a0a0b0",
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
    color: "#e8e8f0",
    margin: 0,
  },
  newButton: {
    padding: "12px 24px",
    backgroundColor: "#7c3aed",
    color: "#e8e8f0",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
  },
  formContainer: {
    backgroundColor: "#1a1a22",
    border: "1px solid #2a2a35",
    borderRadius: "12px",
    marginBottom: "40px",
    overflow: "hidden",
  },
  formTabs: {
    display: "flex",
    gap: "8px",
    padding: "16px",
    borderBottom: "1px solid #2a2a35",
    backgroundColor: "#0a0a0f",
  },
  tabButton: {
    padding: "10px 20px",
    backgroundColor: "#1a1a22",
    color: "#e8e8f0",
    border: "1px solid #2a2a35",
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
    color: "#e8e8f0",
    fontWeight: "600",
    fontSize: "0.95rem",
  },
  input: {
    padding: "12px",
    backgroundColor: "#0a0a0f",
    color: "#e8e8f0",
    border: "1px solid #2a2a35",
    borderRadius: "6px",
    fontSize: "1rem",
    fontFamily: "inherit",
  },
  coverUploadButton: {
    padding: "14px",
    backgroundColor: "#0a0a0f",
    color: "#a0a0b0",
    border: "1px dashed #3a3a45",
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
    border: "1px solid #2a2a35",
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
    backgroundColor: "#0a0a0f",
  },
  coverChangeButton: {
    padding: "8px 16px",
    backgroundColor: "#7c3aed",
    color: "#e8e8f0",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "0.9rem",
  },
  coverRemoveButton: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "#ff8080",
    border: "1px solid #5a2a3a",
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
    backgroundColor: "#7c3aed",
    color: "#e8e8f0",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
  },
  cancelButton: {
    padding: "12px 24px",
    backgroundColor: "#2a2a35",
    color: "#e8e8f0",
    border: "1px solid #3a3a45",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
  preview: {
    padding: "40px",
    backgroundColor: "#0a0a0f",
  },
  previewTitle: {
    fontSize: "2rem",
    color: "#e8e8f0",
    marginBottom: "16px",
  },
  previewExcerpt: {
    fontSize: "1.1rem",
    color: "#b0b0c0",
    fontStyle: "italic",
    marginBottom: "24px",
  },
  previewContent: {
    color: "#d0d0e0",
    lineHeight: "1.8",
    fontSize: "1.05rem",
  },
  articlesSection: {
    backgroundColor: "#1a1a22",
    border: "1px solid #2a2a35",
    borderRadius: "12px",
    padding: "24px",
  },
  subtitle: {
    fontSize: "1.3rem",
    color: "#e8e8f0",
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
    color: "#e8e8f0",
    fontWeight: "600",
    borderBottom: "1px solid #2a2a35",
    backgroundColor: "#0a0a0f",
  },
  tr: {
    borderBottom: "1px solid #2a2a35",
  },
  td: {
    padding: "12px",
    color: "#d0d0e0",
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
    backgroundColor: "#7c3aed",
    color: "#e8e8f0",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  deleteButton: {
    padding: "6px 12px",
    backgroundColor: "#5a2a3a",
    color: "#ff8080",
    border: "1px solid #7a4a5a",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  loading: {
    color: "#a0a0b0",
    textAlign: "center",
    padding: "20px",
  },
  empty: {
    color: "#a0a0b0",
    textAlign: "center",
    padding: "20px",
  },
};
