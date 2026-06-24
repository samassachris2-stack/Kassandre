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

export default function CGU() {
  return (
    <div style={S.page}>
      <h1 style={S.title}>Conditions Générales d'Utilisation</h1>
      <p style={S.updated}>Dernière mise à jour : à compléter</p>

      <div style={S.notice}>
        Cette page est un contenu provisoire. Elle sera remplacée par des CGU rédigées
        et validées avant le lancement public de Kassandre.
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>1. Objet</h2>
        <p style={S.text}>
          Kassandre est une plateforme de marchés de prédiction fonctionnant exclusivement
          en monnaie virtuelle ("points"), sans valeur monétaire réelle et sans possibilité
          de conversion en argent réel.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>2. Accès au service</h2>
        <p style={S.text}>
          L'accès à Kassandre nécessite la création d'un compte via une authentification
          Google. L'utilisateur s'engage à fournir des informations exactes et à ne pas
          usurper l'identité d'un tiers.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>3. Fonctionnement des marchés</h2>
        <p style={S.text}>
          Les marchés proposés sur Kassandre sont résolus selon une source de référence
          indiquée sur chaque marché. Kassandre se réserve le droit de modifier, suspendre
          ou résoudre un marché en cas d'ambiguïté ou d'erreur manifeste.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>4. Absence de valeur réelle</h2>
        <p style={S.text}>
          Les points utilisés sur Kassandre n'ont aucune valeur monétaire, ne peuvent être
          achetés, vendus, ni convertis en devise réelle ou cryptomonnaie.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>5. Modification des conditions</h2>
        <p style={S.text}>
          Kassandre se réserve le droit de modifier les présentes conditions à tout moment.
          Les utilisateurs seront informés des changements significatifs.
        </p>
      </div>
    </div>
  );
}
