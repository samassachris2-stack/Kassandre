export default function ShareButtons({ title, url, excerpt }) {
  const shareUrl = `https://kassandre.app${url}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedExcerpt = encodeURIComponent(excerpt);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedExcerpt}%0A%0A${encodedUrl}`,
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>Partager</span>
      <div style={styles.buttons}>
        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.button}
          title="Partager sur Twitter"
        >
          𝕏
        </a>
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.button}
          title="Partager sur Facebook"
        >
          f
        </a>
        <a
          href={shareLinks.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.button}
          title="Partager sur LinkedIn"
        >
          in
        </a>
        <a
          href={shareLinks.email}
          style={styles.button}
          title="Envoyer par email"
        >
          ✉
        </a>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(shareUrl);
            alert('Lien copié dans le presse-papiers !');
          }}
          style={styles.button}
          title="Copier le lien"
        >
          🔗
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "12px 16px",
    padding: "16px",
    backgroundColor: "#1a1a22",
    border: "1px solid #2a2a35",
    borderRadius: "8px",
    marginBottom: "40px",
    boxSizing: "border-box",
    maxWidth: "100%",
  },
  label: {
    color: "#e8e8f0",
    fontWeight: "600",
    fontSize: "0.95rem",
  },
  buttons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    minWidth: 0,
  },
  button: {
    padding: "10px 12px",
    backgroundColor: "#0a0a0f",
    color: "#e8e8f0",
    border: "1px solid #2a2a35",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: "500",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "44px",
    transition: "all 0.2s",
  },
};
