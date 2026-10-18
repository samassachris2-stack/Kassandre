import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConsent, setConsent, startAnalytics } from "../lib/analytics";

// Bandeau affiché tant que l'utilisateur n'a pas fait de choix.
// Accepter active la mesure d'audience ; refuser ne la charge jamais.
export default function CookieBanner() {
  const [consent, setLocalConsent] = useState(() => getConsent());

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
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "12px",
        padding: "14px 16px",
        backgroundColor: "#0f0f17",
        border: "1px solid rgba(124,58,237,0.4)",
        borderRadius: "10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      <p style={{ flex: "1 1 280px", margin: 0, fontSize: "13px", color: "#a8a8b8", lineHeight: 1.5 }}>
        Kassandre utilise des cookies de mesure d'audience pour améliorer le site. Tu peux accepter
        ou refuser. Plus de détails dans la{" "}
        <Link to="/confidentialite" style={{ color: "#a78bfa" }}>politique de confidentialité</Link>.
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={() => choose("refused")}
          style={{ padding: "8px 14px", background: "transparent", color: "#8888a0", border: "1px solid #2a2a35", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={() => choose("accepted")}
          style={{ padding: "8px 14px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
        >
          Accepter
        </button>
      </div>
    </div>
  );
}
