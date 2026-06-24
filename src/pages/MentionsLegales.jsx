const S = {
  page: {
    maxWidth: "700px",
    margin: "40px auto",
    padding: "0 16px 80px",
  },
  title: {
    fontSize: "26px",
    fontWeight: "600",
    color: "#e8e8f0",
    marginBottom: "8px",
  },
  updated: {
    fontSize: "13px",
    color: "#8888a0",
    marginBottom: "32px",
  },
  section: {
    marginBottom: "28px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#e8e8f0",
    marginBottom: "10px",
  },
  text: {
    fontSize: "14px",
    color: "#a8a8b8",
    lineHeight: "1.7",
  },
  notice: {
    background: "rgba(124,58,237,0.08)",
    border: "0.5px solid rgba(124,58,237,0.2)",
    borderRadius: "10px",
    padding: "14px 16px",
    fontSize: "13px",
    color: "#a78bfa",
    marginBottom: "32px",
  },
};

export default function MentionsLegales() {
  return (
    <div style={S.page}>
      <h1 style={S.title}>Mentions légales</h1>
      <p style={S.updated}>Dernière mise à jour : à compléter</p>

      <div style={S.notice}>
        Cette page est un contenu provisoire. Les mentions légales définitives (identité
        de l'éditeur, hébergeur, immatriculation) seront complétées avant le lancement
        public de Kassandre.
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>Éditeur du site</h2>
        <p style={S.text}>
          Kassandre est édité à titre personnel par Chris, basé en Île-de-France, France.
          Coordonnées de contact à compléter.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>Hébergement</h2>
        <p style={S.text}>
          Le site est hébergé par Vercel Inc. L'infrastructure de données est gérée par
          Google Firebase.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>Nature du service</h2>
        <p style={S.text}>
          Kassandre est une plateforme de marchés de prédiction fonctionnant exclusivement
          en monnaie virtuelle, sans valeur monétaire réelle, sans agrément ni licence de
          jeux d'argent, et n'entrant pas dans le champ de la réglementation française des
          jeux d'argent et de hasard tant qu'aucune contrepartie financière réelle n'est
          proposée.
        </p>
      </div>
    </div>
  );
}
