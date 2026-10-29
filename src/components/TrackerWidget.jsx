import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Bandeau d'accueil qui met en avant le tracker de prévisions.
// Pour un membre connecté, on utilise les compteurs déjà présents sur son
// profil (aucune lecture supplémentaire en base).
export default function TrackerWidget() {
  const { user, login } = useAuth();
  const resolved = user?.totalResolvedBets ?? 0;
  const wins = user?.totalWins ?? 0;
  const rate = resolved > 0 ? Math.round((wins / resolved) * 100) : null;

  return (
    <section
      style={{
        marginBottom: "28px", borderRadius: "14px", padding: "16px 18px",
        border: "0.5px solid rgba(var(--k-accent-rgb),0.35)",
        background: "linear-gradient(135deg, rgba(var(--k-accent-rgb),0.16), rgba(var(--k-inset-rgb),0.9))",
        display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--k-accent-text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
          Tracker de prévisions
        </div>
        {!user && (
          <div style={{ fontSize: "15px", color: "var(--k-text)", lineHeight: 1.4 }}>
            Prévois-tu mieux que le marché ? Mesure ton taux de réussite, ta calibration et ton avantage, catégorie par catégorie.
          </div>
        )}
        {user && rate === null && (
          <div style={{ fontSize: "15px", color: "var(--k-text)", lineHeight: 1.4 }}>
            Ton tracker se remplira dès qu'un de tes marchés sera résolu. Plus tu pronostiques, plus il devient précis.
          </div>
        )}
        {user && rate !== null && (
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "28px", fontWeight: 800, color: rate >= 50 ? "#22c55e" : "var(--k-text)" }}>{rate} %</span>
            <span style={{ fontSize: "14px", color: "var(--k-muted2)" }}>
              de réussite sur {resolved} marché{resolved > 1 ? "s" : ""} résolu{resolved > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
      {user ? (
        <Link to={`/tracker/${user.uid}`} style={btn}>
          {rate === null ? "Voir mon tracker" : "Analyser mes prévisions"} →
        </Link>
      ) : (
        <button type="button" onClick={login} style={{ ...btn, border: "none", cursor: "pointer" }}>
          Se connecter pour voir le mien
        </button>
      )}
    </section>
  );
}

const btn = {
  display: "inline-block", background: "var(--k-accent)", color: "#fff", fontWeight: 700, fontSize: "14px",
  textDecoration: "none", borderRadius: "10px", padding: "10px 18px", flexShrink: 0,
};
