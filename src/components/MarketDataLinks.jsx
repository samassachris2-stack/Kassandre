import { Link } from "react-router-dom";

const API = "https://kassandre.app/api/v1";

// Accès aux données ouvertes depuis la fiche d'un marché : fiche et historique
// téléchargeables, et lien vers le classement du thème sur la page Données ouvertes.
export default function MarketDataLinks({ market, marketId }) {
  const cats = Array.isArray(market.categories) ? market.categories : market.category ? [market.category] : [];
  const topic = cats[0];
  const a = { color: "var(--k-accent-text)", fontSize: "13px", textDecoration: "none", border: "1px solid var(--k-border)", borderRadius: "8px", padding: "6px 11px", background: "var(--k-inset)" };
  return (
    <section style={{ marginTop: "20px", textAlign: "left", border: "1px solid var(--k-border)", borderRadius: "12px", padding: "16px", background: "var(--k-surface)" }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--k-text)", margin: "0 0 4px" }}>Données de ce marché</h3>
      <p style={{ fontSize: "12px", color: "var(--k-muted)", margin: "0 0 12px", lineHeight: 1.45 }}>
        Libres et gratuites (licence CC BY 4.0), pour tes articles, tes analyses ou tes propres calculs.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <a style={a} href={`${API}/markets/${marketId}`} target="_blank" rel="noreferrer noopener">Fiche (JSON)</a>
        <a style={a} href={`${API}/markets/${marketId}/history.csv`}>Historique des probabilités (CSV)</a>
        <Link style={a} to="/donnees">Toutes les données</Link>
        {topic && <Link style={a} to={`/donnees?cat=${encodeURIComponent(topic)}#anticipe`}>Qui anticipe le mieux en {topic} ?</Link>}
      </div>
    </section>
  );
}
