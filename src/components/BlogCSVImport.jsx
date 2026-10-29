import { useState, useRef } from 'react';
import { parseCSV, validateArticle, csvRowToArticle } from '../lib/csvParser';
import { Timestamp } from 'firebase/firestore';
import { createArticle } from '../lib/articles';

export default function BlogCSVImport({ onImportComplete }) {
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [parsedArticles, setParsedArticles] = useState([]);
  const [errors, setErrors] = useState([]);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      // Validate all rows
      const articlesToImport = [];
      const validationErrors = [];

      rows.forEach((row, index) => {
        const article = csvRowToArticle(row);
        const rowErrors = validateArticle(article);

        if (rowErrors.length > 0) {
          validationErrors.push({
            row: index + 2, // +2 because header is row 1
            title: row.title,
            errors: rowErrors,
          });
        } else {
          articlesToImport.push({ ...article, rowIndex: index });
        }
      });

      setParsedArticles(articlesToImport);
      setErrors(validationErrors);

      if (validationErrors.length === 0) {
        setShowPreview(true);
      }
    } catch (error) {
      setErrors([{ error: `CSV parsing error: ${error.message}` }]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const article of parsedArticles) {
      try {
        await createArticle({
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          content: article.content,
          tags: article.tags,
          linkedMarkets: article.linkedMarkets,
          status: article.status,
          // Colonne facultative publishedAt (AAAA-MM-JJ ou AAAA-MM-JJ HH:MM)
          ...(article.publishedAt && !Number.isNaN(new Date(article.publishedAt.replace(' ', 'T')).getTime())
            ? { publishedAt: Timestamp.fromDate(new Date(article.publishedAt.replace(' ', 'T'))) }
            : {}),
        });
        success++;
      } catch (error) {
        console.error('Error importing article:', article.title, error);
        failed++;
      }
    }

    setSuccessCount(success);
    setFailedCount(failed);
    setImporting(false);
    setShowPreview(false);
    setParsedArticles([]);

    if (onImportComplete) {
      onImportComplete();
    }
  };

  const handleReset = () => {
    setParsedArticles([]);
    setErrors([]);
    setShowPreview(false);
    setSuccessCount(0);
    setFailedCount(0);
  };

  return (
    <div style={styles.container}>
      {successCount > 0 && (
        <div style={styles.successMessage}>
          ✓ {successCount} article(s) importé(s) avec succès
          {failedCount > 0 && ` (${failedCount} erreur(s))`}
          <button
            type="button"
            onClick={handleReset}
            style={styles.closeButton}
          >
            ×
          </button>
        </div>
      )}

      {!showPreview && successCount === 0 && (
        <div style={styles.uploadSection}>
          <label style={styles.uploadLabel}>
            Importer des articles depuis CSV
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={styles.uploadButton}
            disabled={importing}
          >
            📄 Sélectionner un fichier CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <p style={styles.help}>
            Format CSV: title, slug, excerpt, content, tags (séparés par ;),
            linkedMarkets (séparés par ;), status (draft/published), publishedAt (facultatif, AAAA-MM-JJ)
          </p>
        </div>
      )}

      {errors.length > 0 && (
        <div style={styles.errorsSection}>
          <h3 style={styles.errorTitle}>Erreurs de validation</h3>
          {errors.map((err, idx) => (
            <div key={idx} style={styles.errorItem}>
              {err.row ? (
                <>
                  <strong>Ligne {err.row} ({err.title})</strong>
                  <ul style={styles.errorList}>
                    {err.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>{err.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showPreview && parsedArticles.length > 0 && (
        <div style={styles.previewSection}>
          <h3 style={styles.previewTitle}>
            Aperçu ({parsedArticles.length} article(s))
          </h3>
          <div style={styles.previewList}>
            {parsedArticles.map((article, idx) => (
              <div key={idx} style={styles.previewItem}>
                <div style={styles.previewHeader}>
                  <span style={styles.previewTitle2}>{article.title}</span>
                  <span style={{
                    ...styles.previewBadge,
                    backgroundColor: article.status === 'published'
                      ? 'rgba(var(--k-accent-rgb), 0.2)'
                      : 'rgba(160, 160, 176, 0.2)',
                    color: article.status === 'published' ? 'var(--k-accent)' : 'var(--k-muted2)',
                  }}>
                    {article.status === 'published' ? 'Publié' : 'Brouillon'}
                  </span>
                </div>
                <p style={styles.previewSlug}>slug: {article.slug}</p>
                <p style={styles.previewExcerpt}>{article.excerpt}</p>
                {article.tags.length > 0 && (
                  <div style={styles.previewTags}>
                    {article.tags.map((tag, i) => (
                      <span key={i} style={styles.tag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={handleImport}
              style={styles.importButton}
              disabled={importing}
            >
              {importing ? 'Importation en cours...' : '✓ Importer tous les articles'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={styles.cancelButton}
              disabled={importing}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: 'var(--k-surface2)',
    border: '1px solid var(--k-border)',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  uploadSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  uploadLabel: {
    color: 'var(--k-text)',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  uploadButton: {
    padding: '12px',
    backgroundColor: 'var(--k-bg)',
    color: 'var(--k-muted2)',
    border: '1px dashed var(--k-border2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  help: {
    color: 'var(--k-muted2)',
    fontSize: '0.85rem',
    margin: '8px 0 0 0',
    fontStyle: 'italic',
  },
  errorsSection: {
    padding: '16px',
    backgroundColor: 'var(--k-red-bg)',
    border: '1px solid #7a4a4a',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  errorTitle: {
    color: 'var(--k-red-text)',
    marginTop: 0,
    marginBottom: '12px',
  },
  errorItem: {
    marginBottom: '12px',
    color: 'var(--k-red-text)',
  },
  errorList: {
    margin: '6px 0 0 20px',
    color: 'var(--k-red-text)',
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  previewTitle: {
    color: 'var(--k-text)',
    margin: 0,
    fontSize: '1.1rem',
  },
  previewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  previewItem: {
    padding: '12px',
    backgroundColor: 'var(--k-bg)',
    border: '1px solid var(--k-border)',
    borderRadius: '6px',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  previewTitle2: {
    color: 'var(--k-text)',
    fontWeight: '600',
  },
  previewBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '500',
  },
  previewSlug: {
    color: 'var(--k-muted2)',
    fontSize: '0.85rem',
    margin: '4px 0',
  },
  previewExcerpt: {
    color: 'var(--k-text)',
    fontSize: '0.9rem',
    margin: '4px 0',
  },
  previewTags: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginTop: '8px',
  },
  tag: {
    display: 'inline-block',
    padding: '3px 8px',
    backgroundColor: 'rgba(var(--k-accent-rgb), 0.15)',
    color: 'var(--k-accent-text)',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  importButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: 'var(--k-accent)',
    color: 'var(--k-text)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1rem',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'var(--k-border)',
    color: 'var(--k-text)',
    border: '1px solid var(--k-border2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  successMessage: {
    padding: '12px 16px',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    color: '#4caf50',
    borderLeft: '3px solid #4caf50',
    borderRadius: '4px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#4caf50',
    cursor: 'pointer',
    fontSize: '1.2rem',
    padding: 0,
  },
};
