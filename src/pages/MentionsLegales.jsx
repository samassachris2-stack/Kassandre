const S = {
  page: { maxWidth: "700px", margin: "40px auto", padding: "0 16px 80px" },
  title: { fontSize: "26px", fontWeight: "600", color: "#e8e8f0", marginBottom: "8px" },
  updated: { fontSize: "13px", color: "#8888a0", marginBottom: "32px" },
  section: { marginBottom: "28px" },
  sectionTitle: { fontSize: "16px", fontWeight: "600", color: "#e8e8f0", marginBottom: "10px" },
  text: { fontSize: "14px", color: "#a8a8b8", lineHeight: "1.7" },
};

export default function MentionsLegales() {
  return (
    <div style={S.page}>
      <h1 style={S.title}>Mentions légales</h1>
      <p style={S.updated}>Dernière mise à jour : 4 juillet 2026</p>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>Éditeur du site</h2>
        <p style={S.text}>
          Le site kassandre.app est édité par Kassandre, plateforme de marchés de prédiction
          francophone.<br />
          Localisation : Île-de-France, France.<br />
          Contact : contact@kassandre.app
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>Hébergement</h2>
        <p style={S.text}>
          Le site est hébergé par Vercel Inc., 340 Pine Street, Suite 900, San Francisco,
          CA 94104, États-Unis (vercel.com).<br />
          L'infrastructure de données est gérée par Google Firebase (Google LLC,
          1600 Amphitheatre Parkway, Mountain View, CA 94043, États-Unis).
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>Nature du service</h2>
        <p style={S.text}>
          Kassandre est une plateforme de marchés de prédiction fonctionnant exclusivement
          en monnaie virtuelle ("points"), sans valeur monétaire réelle. Aucune somme
          d'argent réelle ne peut être misée, gagnée ou perdue sur la plateforme.
          Le service n'entre pas dans le champ de la réglementation française des jeux
          d'argent et de hasard (loi n° 2010-476 du 12 mai 2010) dès lors qu'aucune
          contrepartie financière réelle n'est proposée.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>Propriété intellectuelle</h2>
        <p style={S.text}>
          L'ensemble des éléments constituant le site kassandre.app (design, code, textes,
          logo) est la propriété exclusive de Kassandre. Toute reproduction, même partielle,
          est interdite sans autorisation préalable.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.sectionTitle}>Contact</h2>
        <p style={S.text}>
          Pour toute question ou signalement : contact@kassandre.app
        </p>
      </div>
    </div>
  );
}