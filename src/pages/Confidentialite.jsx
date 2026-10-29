const S = {
  page: { maxWidth: "700px", margin: "40px auto", padding: "0 16px 80px" },
  title: { fontSize: "26px", fontWeight: "600", color: "var(--k-text)", marginBottom: "8px" },
  updated: { fontSize: "13px", color: "var(--k-muted)", marginBottom: "32px" },
  section: { marginBottom: "28px" },
  sectionTitle: { fontSize: "16px", fontWeight: "600", color: "var(--k-text)", marginBottom: "10px" },
  text: { fontSize: "14px", color: "var(--k-muted2)", lineHeight: "1.7" },
  list: { fontSize: "14px", color: "var(--k-muted2)", lineHeight: "1.7", paddingLeft: "20px" },
};

export default function Confidentialite() {
  return (
    <div style={S.page}>
      <h1 style={S.title}>Politique de confidentialité</h1>
      <p style={S.updated}>Dernière mise à jour : 18 octobre 2026</p>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>1. Responsable du traitement</h2>
        <p style={S.text}>
          Le responsable du traitement des données collectées sur kassandre.app est
          l'éditeur de la plateforme Kassandre, joignable à l'adresse : contact@kassandre.app
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>2. Données collectées</h2>
        <ul style={S.list}>
          <li>Nom d'affichage et adresse e-mail (via connexion Google OAuth)</li>
          <li>Photo de profil (via connexion Google OAuth)</li>
          <li>Historique des paris, positions et transactions sur la plateforme</li>
          <li>Pseudo personnalisé, le cas échéant</li>
          <li>Données techniques de navigation (logs serveur Firebase)</li>
          <li>
            Facultatif, uniquement avec votre consentement explicite : département, arrondissement de
            Paris, tranche d'âge et domaine d'activité (voir ci-dessous)
          </li>
        </ul>
        <p style={S.text}>
          <strong>Profil facultatif.</strong> Ces informations sont stockées dans un espace privé, lisible
          uniquement par vous. Elles ne sont jamais affichées avec votre nom ni sur votre profil public.
          Elles servent à calculer, côté serveur, des statistiques de groupes (par exemple « part des
          membres d'un département qui parient OUI »). Un groupe n'est publié que s'il compte au moins
          10 personnes, et les résultats des petits groupes sont arrondis. Vous pouvez modifier ou effacer
          ces informations, et retirer votre consentement, à tout moment depuis Paramètres.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>3. Finalités du traitement</h2>
        <p style={S.text}>
          Les données collectées servent exclusivement au fonctionnement du service :
          authentification, affichage du profil, calcul des positions et du classement,
          et amélioration de la plateforme. Aucune donnée personnelle n'est vendue, louée
          ou cédée à des tiers à des fins commerciales.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>4. Base légale</h2>
        <p style={S.text}>
          Le traitement repose sur l'exécution du service auquel l'utilisateur a consenti
          lors de la création de son compte (article 6.1.b du RGPD).
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>5. Conservation des données</h2>
        <p style={S.text}>
          Les données sont conservées tant que le compte est actif. En cas d'inactivité
          prolongée (supérieure à 2 ans) ou à la demande de l'utilisateur, les données
          peuvent être supprimées.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>6. Sous-traitants</h2>
        <p style={S.text}>
          Kassandre utilise les services suivants, soumis à leurs propres politiques de
          confidentialité : Google Firebase (authentification et base de données),
          Vercel (hébergement), Google OAuth (connexion).
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>7. Vos droits</h2>
        <p style={S.text}>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification,
          d'effacement, de limitation et de portabilité de vos données personnelles.
          Pour exercer ces droits ou pour toute question : contact@kassandre.app
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>8. Cookies</h2>
        <p style={S.text}>
          Cookies strictement nécessaires : ils servent à la session de connexion et à la
          sécurité du service. Le service de sécurité Google reCAPTCHA, utilisé pour protéger
          le site contre les abus, peut déposer ses propres cookies techniques. Ils sont
          déposés sans ton accord.
        </p>
        <p style={S.text}>
          Cookies de mesure d'audience : Kassandre utilise Firebase Analytics (Google) pour
          comprendre quelles pages sont consultées. Ces cookies ne sont déposés que si tu
          acceptes dans le bandeau. Tu peux refuser à tout moment ; ton choix est conservé
          dans ton navigateur. Aucun cookie publicitaire n'est utilisé.
        </p>
      </div>
    </div>
  );
}