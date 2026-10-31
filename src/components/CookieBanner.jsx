import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConsent, setConsent, startAnalytics } from "../lib/analytics";

// Bandeau affiché tant que l'utilisateur n'a pas fait de choix.
// Refuser et accepter ont le même poids visuel. « Personnaliser » permet de
// cocher les catégories une par une. Les cookies essentiels sont toujours actifs.
const BTN = {
  padding: "8px 14px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
  border: "1px solid var(--k-border)",
  background: "transparent",
  color: "var(--k-text2)",
};

export default function CookieBanner() {
  const [consent, setLocalConsent] = useState(() => getConsent());
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    startAnalytics();
  }, []);

  if (consent) return null;

  const choose = (value) => {
    setConsent(value);
    setLocalConsent(value);
  };

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      style={{
        position: "fixed",
        left: "16px",
        right: "16px",
        bottom: "16px",
        maxWidth: "640px",
        margin: "0 auto",
        zIndex: 100,
        padding: "14px 16px",
        backgroundColor: "var(--k-inset)",
        border: "1px solid rgba(var(--k-accent-rgb),0.4)",
        borderRadius: "10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--k-muted2)", lineHeight: 1.5 }}>
        Kassandre utilise des cookies pour fonctionner et, si vous l'acceptez, pour mesurer
        l'audience du site. Détails dans la{" "}
        <Link to="/confidentialite" style={{ color: "var(--k-accent-text)" }}>politique de confidentialité</Link>.
      </p>

      {details && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "0 0 14px" }}>
          <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "13px", color: "var(--k-text2)" }}>
            <input type="checkbox" checked disabled style={{ marginTop: "3px" }} />
            <span>
              <strong>Essentiels</strong> (toujours actifs) : préférences et fonctionnement du site.
            </span>
          </label>
          <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "13px", color: "var(--k-text2)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              style={{ marginTop: "3px" }}
            />
            <span>
              <strong>Mesure d'audience</strong> : savoir quels articles et marchés vous intéressent
              pour améliorer le site (Firebase Analytics).
            </span>
          </label>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "flex-end" }}>
        {details ? (
          <button type="button" onClick={() => choose(analytics ? "accepted" : "refused")} style={{ ...BTN, background: "var(--k-accent)", color: "#fff", border: "none" }}>
            Enregistrer mes choix
          </button>
        ) : (
          <button type="button" onClick={() => setDetails(true)} style={BTN}>
            Personnaliser
          </button>
        )}
        <button type="button" onClick={() => choose("refused")} style={BTN}>
          Tout refuser
        </button>
        <button type="button" onClick={() => choose("accepted")} style={{ ...BTN, background: "var(--k-accent)", color: "#fff", border: "none" }}>
          Tout accepter
        </button>
      </div>
    </div>
  );
}
