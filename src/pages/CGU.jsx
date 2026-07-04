const S = {
  page: { maxWidth: "700px", margin: "40px auto", padding: "0 16px 80px" },
  title: { fontSize: "26px", fontWeight: "600", color: "#e8e8f0", marginBottom: "8px" },
  updated: { fontSize: "13px", color: "#8888a0", marginBottom: "32px" },
  section: { marginBottom: "28px" },
  sectionTitle: { fontSize: "16px", fontWeight: "600", color: "#e8e8f0", marginBottom: "10px" },
  text: { fontSize: "14px", color: "#a8a8b8", lineHeight: "1.7" },
  notice: {
    background: "rgba(124,58,237,0.08)", border: "0.5px solid rgba(124,58,237,0.2)",
    borderRadius: "10px", padding: "14px 16px", fontSize: "13px",
    color: "#a78bfa", marginBottom: "32px",
  },
};

export default function CGU() {
  return (
    <div style={S.page}>
      <h1 style={S.title}>Conditions Générales d'Utilisation</h1>
      <p style={S.updated}>Dernière mise à jour : 4 juillet 2026</p>

      <div style={S.notice}>
        Kassandre est une plateforme de marchés de prédiction fonctionnant exclusivement
        en monnaie virtuelle sans valeur réelle. Aucun argent réel n'est en jeu.
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>1. Objet</h2>
        <p style={S.text}>
          Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et
          l'utilisation de la plateforme Kassandre, accessible à l'adresse kassandre.app.
          Kassandre est une plateforme de marchés de prédiction fonctionnant exclusivement
          en monnaie virtuelle ("points"), sans valeur monétaire réelle et sans possibilité
          de conversion en argent réel, cryptomonnaie ou tout autre actif.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>2. Accès au service</h2>
        <p style={S.text}>
          L'accès à Kassandre est gratuit et nécessite la création d'un compte via une
          authentification Google. L'utilisateur s'engage à fournir des informations exactes,
          à ne pas usurper l'identité d'un tiers, et à ne pas utiliser le service à des fins
          frauduleuses ou contraires aux lois en vigueur.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>3. Fonctionnement des marchés</h2>
        <p style={S.text}>
          Chaque marché est assorti d'une question, d'une date de résolution et d'une source
          de référence. Les marchés sont résolus par l'équipe Kassandre sur la base de la
          source indiquée. Kassandre se réserve le droit de modifier, suspendre ou annuler
          un marché en cas d'ambiguïté, d'erreur manifeste ou d'événement imprévu rendant
          la résolution impossible.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>4. Points virtuels</h2>
        <p style={S.text}>
          Les points utilisés sur Kassandre n'ont aucune valeur monétaire. Ils ne peuvent
          être achetés, vendus, échangés ni convertis en devise réelle, cryptomonnaie ou
          tout autre actif ayant une valeur économique. Kassandre n'est pas un service de
          jeux d'argent au sens de la réglementation française.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>5. Comportement des utilisateurs</h2>
        <p style={S.text}>
          L'utilisateur s'engage à ne pas perturber le fonctionnement de la plateforme,
          à ne pas tenter de manipuler les marchés de façon artificielle, et à respecter
          les autres utilisateurs. Kassandre se réserve le droit de suspendre ou supprimer
          tout compte ne respectant pas ces règles.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>6. Responsabilité</h2>
        <p style={S.text}>
          Kassandre est fourni "en l'état". Aucune garantie n'est donnée quant à la
          disponibilité continue du service. Kassandre ne saurait être tenu responsable
          d'une interruption de service, d'une perte de points due à un dysfonctionnement
          technique, ou de tout préjudice indirect lié à l'utilisation de la plateforme.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>7. Modification des conditions</h2>
        <p style={S.text}>
          Kassandre se réserve le droit de modifier les présentes CGU à tout moment.
          Les utilisateurs seront informés des changements significatifs. La poursuite
          de l'utilisation du service après modification vaut acceptation des nouvelles conditions.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>8. Contact</h2>
        <p style={S.text}>
          Pour toute question relative aux présentes CGU : contact@kassandre.app
        </p>
      </div>
    </div>
  );
}