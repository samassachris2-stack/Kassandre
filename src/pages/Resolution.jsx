import { Link } from "react-router-dom";
import { useSEO } from "../hooks/useSEO";

const S = {
  page: { maxWidth: "700px", margin: "40px auto", padding: "0 16px 80px" },
  title: { fontSize: "26px", fontWeight: "600", color: "#e8e8f0", marginBottom: "8px" },
  lead: { fontSize: "15px", color: "#a8a8b8", lineHeight: "1.7", marginBottom: "32px" },
  section: { marginBottom: "28px" },
  h2: { fontSize: "17px", fontWeight: "600", color: "#e8e8f0", marginBottom: "10px" },
  text: { fontSize: "14px", color: "#a8a8b8", lineHeight: "1.7", margin: 0 },
  link: { color: "#a78bfa" },
};

export default function Resolution() {
  const seo = useSEO({
    title: "Comment les marchés sont résolus",
    description: "Règles de résolution des marchés de prédiction Kassandre : sources de référence, délais, calcul des gains et cas d'annulation.",
    url: "/resolution",
  });

  return (
    <div style={S.page}>
      {seo}
      <h1 style={S.title}>Comment les marchés sont résolus</h1>
      <p style={S.lead}>
        Un marché de prédiction n'a de valeur que si son résultat est incontestable.
        Voici les règles que nous appliquons à chaque marché de Kassandre.
      </p>

      <div style={S.section}>
        <h2 style={S.h2}>Une question précise et une source</h2>
        <p style={S.text}>
          Chaque marché pose une question dont la réponse est vérifiable, avec une date de
          résolution et une source de référence (site officiel, agence de presse, résultats
          publiés). Le résultat est celui que donne cette source, pas une opinion.
          La source figure en bas de la page de chaque marché.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.h2}>Quand un marché est-il résolu ?</h2>
        <p style={S.text}>
          Les paris se terminent à la date de résolution indiquée. Nous résolvons le marché
          dès que la source de référence confirme le résultat, en général peu après cette date,
          avec une marge pour attendre les publications officielles. Si le résultat n'est pas
          encore connu, le marché reste en attente plutôt que d'être résolu à la hâte.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.h2}>Qui résout ?</h2>
        <p style={S.text}>
          Les marchés sont résolus par l'équipe Kassandre, sur la seule base de la source
          indiquée. Le calcul des gains est automatique : personne ne peut ajuster à la main
          ce que reçoit un membre.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.h2}>Comment sont calculés les gains ?</h2>
        <p style={S.text}>
          Kassandre fonctionne avec des points virtuels, sans argent réel. Quand un marché est
          résolu, les membres qui avaient la bonne réponse récupèrent leur mise, plus une part
          des mises perdantes, proportionnelle au nombre de parts qu'ils détenaient. Des frais
          de 2 % s'appliquent à cette part et aux achats et ventes de parts. Les perdants
          perdent leur mise.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.h2}>Cas ambigus ou imprévus</h2>
        <p style={S.text}>
          Si une question se révèle ambiguë, contient une erreur manifeste ou devient
          impossible à trancher à cause d'un événement imprévu, Kassandre peut modifier,
          suspendre ou annuler le marché. Ce cadre est précisé dans les{" "}
          <Link to="/cgu" style={S.link}>conditions d'utilisation</Link>.
        </p>
      </div>

      <div style={S.section}>
        <h2 style={S.h2}>Une question ou un désaccord ?</h2>
        <p style={S.text}>
          Si vous pensez qu'un marché a été mal résolu, écrivez-nous à contact@kassandre.app
          en indiquant le marché concerné et la source qui, selon vous, donne un autre résultat.
        </p>
      </div>
    </div>
  );
}
