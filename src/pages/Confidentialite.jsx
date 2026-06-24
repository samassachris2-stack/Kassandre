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
  list: {
    fontSize: "14px",
    color: "#a8a8b8",
    lineHeight: "1.7",
    paddingLeft: "20px",
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

export default function Confidentialite() {
  return (
    <div style={S.page}>
      <h1 style={S.title}>Politique de confidentialité</h1>
      <p style={S.updated}>Dernière mise à jour : à compléter</p>

      <div style={S.notice}>
        Cette page est un contenu provisoire. Elle sera remplacée par une politique de
        confidentialité conforme au RGPD avant le lancement public de Kassandre.
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>1. Données collectées</h2>
        <ul style={S.list}>
          <li>Nom et adresse e-mail (via connexion Google)</li>
          <li>Photo de profil (via connexion Google)</li>
          <li>Historique des paris et positions sur la plateforme</li>
          <li>Avatar personnalisé, le cas échéant</li>
        </ul>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>2. Utilisation des données</h2>
        <p style={S.text}>
          Les données collectées servent uniquement au fonctionnement du service :
          authentification, affichage du profil, calcul des positions et du classement.
          Aucune donnée n'est vendue à des tiers.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>3. Conservation des données</h2>
        <p style={S.text}>
          Les données sont conservées tant que le compte est actif. L'utilisateur peut
          demander la suppression de son compte et de ses données associées.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>4. Vos droits</h2>
        <p style={S.text}>
          Conformément à la réglementation applicable, vous disposez d'un droit d'accès,
          de rectification et de suppression de vos données personnelles.
        </p>
      </div>
    </div>
  );
}
