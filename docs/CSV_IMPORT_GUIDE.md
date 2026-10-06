# Guide d'import CSV pour les articles

## Comment ça marche

La page `/admin/blog` propose un outil d'import CSV qui te permet de créer plusieurs articles en une seule opération. C'est beaucoup plus rapide que de créer chaque article individuellement.

## Format du CSV

Le CSV doit avoir **obligatoirement** ces colonnes dans cet ordre :

```
title,slug,excerpt,content,tags,linkedMarkets,status
```

### Explication des colonnes

- **title** (obligatoire) : Titre de l'article
- **slug** (obligatoire) : URL-friendly identifier (ex: `elections-2027`, `analyse-fed`)
- **excerpt** (obligatoire) : Résumé court (1-2 phrases)
- **content** (obligatoire) : Contenu HTML de l'article (peut contenir du HTML TipTap)
- **tags** (optionnel) : Tags séparés par `;` (ex: `politique;france;2027`)
- **linkedMarkets** (optionnel) : Market IDs séparés par `;` (ex: `market-001;market-002`)
- **status** (optionnel) : `draft` ou `published` (défaut: `draft`)

## Exemple de CSV

```csv
title,slug,excerpt,content,tags,linkedMarkets,status
"Élections 2027 : premier analyse","elections-2027","Les enjeux majeurs de 2027","<p>Le scrutin de 2027...</p>","politique;france;election","market-001;market-002",published
"Fed relève les taux","fed-rates-2026","Impact sur les crypto","<p>La Réserve fédérale...</p>","economie;usa;fed","market-003",draft
```

## Points importants

1. **Guillemets autour du contenu** : Si ton contenu contient des virgules ou des guillemets, entoure la valeur entre guillemets :
   ```csv
   "Titre avec, virgule","slug","Excerpt","Contenu avec, virgules",...
   ```

2. **Séparateurs spéciaux** :
   - Tags : séparés par `;` (pas virgule)
   - Market IDs : séparés par `;` (pas virgule)

3. **Contenu HTML** : Le contenu peut être du HTML simple ou du HTML généré par TipTap. Exemple :
   ```html
   <p>Paragraphe</p><h2>Titre</h2><ul><li>Liste</li></ul>
   ```

4. **Validation** : Avant l'import, le système valide tous les articles. S'il y a des erreurs (titre vide, slug manquant, etc.), elles s'affichent et l'import s'arrête.

5. **Status** : Si tu ne mets rien, l'article sera en brouillon (`draft`). Pour publier directement, mets `published`.

## Workflow rapide

1. Va à `/admin/blog`
2. Clique sur "📄 Sélectionner un fichier CSV"
3. Sélectionne ton fichier `.csv`
4. Vérifie l'aperçu des articles
5. Clique sur "✓ Importer tous les articles"
6. Les articles sont créés immédiatement dans Firestore

## Génération du CSV

Tu peux générer le CSV avec :
- Google Sheets (Export → CSV)
- Excel (Enregistrer sous → CSV)
- Tout éditeur de texte (crée un `.txt` et renomme-le `.csv`)

## Exemple avec contenu complet

Voici un exemple avec du contenu plus réaliste :

```csv
title,slug,excerpt,content,tags,linkedMarkets,status
"Hausse des taux Fed","fed-hausse-septembre","La Fed augmente de 25 bps, impact immédiat sur le marché","<h2>La décision</h2><p>La Réserve fédérale a annoncé une hausse de 25 points de base...</p><blockquote>Citation importante</blockquote><p>Les analystes predisent...</p>","economie;usa;fed;rates","market-fed-rates;market-sp500",published
```

## Cas d'usage typique

Quand tu dois couvrir plusieurs articles rapidement (actualité), copier-colle dans un tableur :

| Titre | Slug | Excerpt | Content | Tags | Markets | Status |
|-------|------|---------|---------|------|---------|--------|
| ... | ... | ... | ... | ... | ... | ... |

Puis exporte en CSV et importe dans Kassandre en 2 clics. Ça t'économise 30+ secondes par article 🚀

