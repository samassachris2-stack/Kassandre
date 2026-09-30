import { useState, useEffect } from "react";
import {
  getAllArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  generateSlug,
} from "../lib/articles";

export default function BlogAdmin() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    tags: "",
    linkedMarkets: "",
    status: "draft",
  });

  useEffect(() => {
    loadArticles();
  }, []);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const articleData = {
      title: formData.title,
      slug: formData.slug,
      excerpt: formData.excerpt,
      content: formData.content,
      tags: formData.tags.split(",").map((tag) => tag.trim()),
      linkedMarkets: formData.linkedMarkets
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id),
      status: formData.status,
    };

    try {
      if (editingId) {
        await updateArticle(editingId, articleData);
      } else {
        await createArticle(articleData);
      }

      setFormData({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        tags: "",
        linkedMarkets: "",
        status: "draft",
      });
      setEditingId(null);
      setShowForm(false);
      await loadArticles();
    } catch (error) {
      console.error("Error saving article:", error);
      alert("Erreur lors de l'enregistrement de l'article");
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
    });
    setEditingId(article.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet article?")) {
      return;
    }

    try {
      await deleteArticle(id);
      await loadArticles();
    } catch (error) {
      console.error("Error deleting article:", error);
      alert("Erreur lors de la suppression de l'article");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      tags: "",
      linkedMarkets: "",
      status: "draft",
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("fr-FR");
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Gestion du Blog</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={styles.newButton}
        >
          {showForm ? "Annuler" : "Nouvel article"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
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
            <label style={styles.label}>Slug (URL)</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              required
              style={styles.input}
              placeholder="slug-de-larticle"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Résumé (excerpt)</label>
            <textarea
              value={formData.excerpt}
              onChange={(e) =>
                setFormData({ ...formData, excerpt: e.target.value })
              }
              style={{ ...styles.input, minHeight: "80px" }}
              placeholder="Court résumé de l'article"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Contenu (Markdown)</label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              required
              style={{ ...styles.input, minHeight: "300px", fontFamily: "monospace" }}
              placeholder="Contenu de l'article en Markdown..."
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Tags (séparés par des virgules)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              style={styles.input}
              placeholder="actualité, analyse, tutoriel"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              IDs de Markets (séparés par des virgules)
            </label>
            <input
              type="text"
              value={formData.linkedMarkets}
              onChange={(e) =>
                setFormData({ ...formData, linkedMarkets: e.target.value })
              }
              style={styles.input}
              placeholder="market-id-1, market-id-2"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Statut</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              style={styles.input}
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </select>
          </div>

          <div style={styles.formActions}>
            <button type="submit" style={styles.submitButton}>
              {editingId ? "Mettre à jour" : "Créer"} l'article
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={styles.cancelButton}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div style={styles.articlesTable}>
        <h3 style={styles.subtitle}>Articles ({articles.length})</h3>

        {loading && <p style={styles.loading}>Chargement...</p>}

        {!loading && articles.length === 0 && (
          <p style={styles.empty}>Aucun article créé.</p>
        )}

        {!loading && articles.length > 0 && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Titre</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}>Date création</th>
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
                    <td style={styles.td}>{formatDate(article.createdAt)}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          onClick={() => handleEdit(article)}
                          style={styles.actionButton}
                        >
                          Éditer
                        </button>
                        <button
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
    padding: "20px",
    backgroundColor: "#0a0a0f",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },
  title: {
    fontSize: "1.5rem",
    color: "#e8e8f0",
    margin: 0,
  },
  subtitle: {
    fontSize: "1.2rem",
    color: "#e8e8f0",
    margin: "0 0 16px 0",
  },
  newButton: {
    padding: "10px 20px",
    backgroundColor: "#7c3aed",
    color: "#e8e8f0",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "1rem",
  },
  form: {
    backgroundColor: "#1a1a22",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "30px",
    border: "1px solid #2a2a35",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    color: "#e8e8f0",
    marginBottom: "8px",
    fontWeight: "500",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "#0a0a0f",
    color: "#e8e8f0",
    border: "1px solid #2a2a35",
    borderRadius: "6px",
    fontSize: "1rem",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  formActions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },
  submitButton: {
    padding: "10px 20px",
    backgroundColor: "#7c3aed",
    color: "#e8e8f0",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
  },
  cancelButton: {
    padding: "10px 20px",
    backgroundColor: "#2a2a35",
    color: "#e8e8f0",
    border: "1px solid #3a3a45",
    borderRadius: "6px",
    cursor: "pointer",
  },
  articlesTable: {
    backgroundColor: "#1a1a22",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #2a2a35",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    backgroundColor: "#0a0a0f",
    color: "#e8e8f0",
    padding: "12px",
    textAlign: "left",
    fontWeight: "500",
    borderBottom: "1px solid #2a2a35",
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
    fontSize: "0.9rem",
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
    fontSize: "0.9rem",
  },
  deleteButton: {
    padding: "6px 12px",
    backgroundColor: "#5a2a3a",
    color: "#ff8080",
    border: "1px solid #7a4a5a",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
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
