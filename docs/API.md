# API ouverte Kassandre

Base : `https://kassandre.app/api/v1` (gratuite, sans clé, lecture seule, licence CC BY 4.0).

| Route | Rôle |
|---|---|
| `GET /markets` | Liste. Paramètres : `status` (open, resolved), `category`, `tag`, `q`, `limit` (200 max), `offset` |
| `GET /markets/{id}` | Fiche complète (résultat, probabilité, options, preuves, note de résolution) |
| `GET /markets/{id}/history` | Probabilité dans le temps (en pourcents) |
| `GET /markets.csv` | Export CSV (mêmes filtres que la liste) |
| `GET /markets/{id}/history.csv` | Historique en CSV |
| `GET /calibration?horizonDays=7` | Probabilité du marché N jours avant la résolution contre résultat réel, score de Brier |
| `GET /stats` | Nombre de marchés par statut et par catégorie |

Implémentation : Cloud Function `publicApi` (functions/public-api.js), servie via la réécriture
`/api/v1/*` de vercel.json. Elle lit Firestore avec l'Admin SDK (hors App Check) et n'expose aucune
donnée utilisateur. Déploiement : `firebase deploy --only functions:publicApi`.

Preuves d'un marché : champ `evidence` (liste de `{type, label, url, archiveUrl, value, date, note}`)
et `resolutionNote` sur le document du marché, modifiables par les admins sur la page du marché.
