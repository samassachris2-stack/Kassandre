import { Link } from "react-router-dom";

const S = {
  footer: {
    background: "var(--k-bg)",
    borderTop: "0.5px solid rgba(var(--k-accent-rgb),0.15)",
    marginTop: "40px",
    padding: "40px 24px 24px",
  },
  inner: {
    maxWidth: "1040px",
    margin: "0 auto",
  },
  topRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "32px",
    marginBottom: "28px",
  },
  brandCol: {
    flex: "1 1 240px",
    minWidth: "200px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  logoText: {
    fontSize: "16px",
    fontWeight: "600",
    color: "var(--k-text)",
  },
  brandDesc: {
    fontSize: "13px",
    color: "var(--k-muted)",
    lineHeight: "1.6",
    maxWidth: "260px",
  },
  col: {
    flex: "1 1 140px",
    minWidth: "120px",
  },
  colTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--k-text)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "12px",
  },
  link: {
    display: "block",
    fontSize: "13px",
    color: "var(--k-muted2)",
    textDecoration: "none",
    marginBottom: "8px",
    transition: "color 0.15s",
  },
  socialRow: {
    display: "flex",
    gap: "10px",
    marginTop: "4px",
  },
  socialLink: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "rgba(var(--k-accent-rgb),0.1)",
    border: "0.5px solid rgba(var(--k-accent-rgb),0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--k-accent-text)",
    textDecoration: "none",
    transition: "background 0.15s, border-color 0.15s",
  },
  disclaimer: {
    background: "rgba(var(--k-accent-rgb),0.06)",
    border: "0.5px solid rgba(var(--k-accent-rgb),0.15)",
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "12px",
    color: "var(--k-muted)",
    lineHeight: "1.6",
    marginBottom: "20px",
  },
  bottomRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    paddingTop: "20px",
    borderTop: "0.5px solid rgba(var(--k-accent-rgb),0.1)",
  },
  copyright: {
    fontSize: "12px",
    color: "var(--k-faint)",
  },
};

export default function Footer() {
  return (
    <footer style={S.footer}>
      <div style={S.inner}>
        <div style={S.topRow}>
          <div style={S.brandCol}>
            <div style={S.logoRow}>
              <svg width="22" height="22" viewBox="0 0 28 28">
                <path d="M 22 22 A 12 12 0 0 1 6 14" fill="none" stroke="var(--k-accent)" strokeWidth="3" strokeLinecap="round"/>
                <path d="M 6 14 A 12 12 0 0 1 22 6" fill="none" stroke="var(--k-accent)" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="14" cy="14" r="4" fill="var(--k-accent)"/>
              </svg>
              <span style={S.logoText}>Kassandre</span>
            </div>
            <p style={S.brandDesc}>
              Le marché de prédiction francophone. Parie en points sur l'actualité,
              le sport et la politique.
            </p>
            <div style={S.socialRow}>
              <a
                href="https://twitter.com/kassandre_app"
                target="_blank" rel="noreferrer"
                style={S.socialLink}
                aria-label="Twitter"
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(var(--k-accent-rgb),0.5)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(var(--k-accent-rgb),0.2)"; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="https://instagram.com/kassandre_app"
                target="_blank" rel="noreferrer"
                style={S.socialLink}
                aria-label="Instagram"
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(var(--k-accent-rgb),0.5)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(var(--k-accent-rgb),0.2)"; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </div>
          </div>

          <div style={S.col}>
            <p style={S.colTitle}>Plateforme</p>
            <Link to="/portefeuille" style={S.link}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--k-text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--k-muted2)"; }}
            >Portefeuille</Link>
            <Link to="/resolution" style={S.link}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--k-text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--k-muted2)"; }}
            >Comment on résout</Link>
            <Link to="/soumettre" style={S.link}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--k-text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--k-muted2)"; }}
            >Proposer un marché</Link>
          </div>

          <div style={S.col}>
            <p style={S.colTitle}>Catégories</p>
            {["Sport", "Politique", "Crypto", "Tech", "Économie", "International", "Culture", "Climat"].map((cat) => (
              <Link key={cat} to={`/${encodeURIComponent(cat)}`} style={S.link}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--k-text)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--k-muted2)"; }}
              >{cat}</Link>
            ))}
            <Link to="/presidentielle-2027" style={S.link}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--k-text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--k-muted2)"; }}
            >Présidentielle 2027</Link>
          </div>

          <div style={S.col}>
            <p style={S.colTitle}>Légal</p>
            <Link to="/cgu" style={S.link}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--k-text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--k-muted2)"; }}
            >CGU</Link>
            <Link to="/confidentialite" style={S.link}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--k-text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--k-muted2)"; }}
            >Confidentialité</Link>
            <Link to="/mentions-legales" style={S.link}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--k-text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--k-muted2)"; }}
            >Mentions légales</Link>
            <Link to="/settings" style={S.link}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--k-text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--k-muted2)"; }}
            >Apparence</Link>
          </div>
        </div>

        <div style={S.disclaimer}>
          Kassandre fonctionne exclusivement en monnaie virtuelle ("points"), sans valeur
          monétaire réelle. Aucun point ne peut être acheté, vendu ou échangé contre de
          l'argent réel ou tout autre actif.
        </div>

        <div style={S.bottomRow}>
          <span style={S.copyright}>© {new Date().getFullYear()} Kassandre. Tous droits réservés.</span>
        </div>
      </div>
    </footer>
  );
}