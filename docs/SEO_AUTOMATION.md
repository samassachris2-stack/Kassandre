# Automatisation du SEO - Kassandre

## Vue d'ensemble

J'ai implémenté une suite complète d'outils SEO pour automatiser les meta tags, structured data et sitemaps des articles du blog.

**Implémenté le 6 oct 2026**

## Composants

### 1. Hook `useSEO()` 

Fichier: `/src/hooks/useSEO.js`

Génère automatiquement les meta tags pour chaque page :
- Meta tags OpenGraph (og:title, og:description, og:image)
- Twitter Card tags
- Meta tags de base (title, description, canonical)
- Article tags (pour les articles: publishedAt, modifiedAt, author, tags)
- JSON-LD structured data

**Usage:**

```jsx
import { useSEO } from '../hooks/useSEO';

export default function MyPage() {
  useSEO({
    title: 'Mon article',
    description: 'Court résumé',
    image: 'https://...',
    url: '/blog/mon-article',
    type: 'article', // ou 'website'
    publishedDate: '2026-10-06T...',
    tags: ['politique', 'france'],
    structuredData: { /* JSON-LD */ }
  });
  
  return (/* ... */);
}
```

### 2. Meta Tags Automatiques

Les articles du blog incluent automatiquement :
- **Title**: `"Titre de l'article | Kassandre"`
- **Description**: Excerpt de l'article
- **og:image**: Cover image de l'article
- **og:url**: URL du blog
- **Canonical**: URL correcte pour éviter le duplicate content
- **Article metadata**: dates, auteur, tags

**Avantage**: Meilleur affichage sur les réseaux sociaux quand quelqu'un partage un article.

### 3. JSON-LD Structured Data

Fichier: `/src/lib/structuredData.js`

Génère du JSON-LD pour les moteurs de recherche :

- **NewsArticle schema** pour chaque article
- **CollectionPage schema** pour la liste d'articles
- **Organization schema** pour la homepage

Exemple pour un article:

```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "Titre de l'article",
  "description": "Excerpt",
  "image": "https://...",
  "datePublished": "2026-10-06T10:00:00Z",
  "author": { "name": "Kassandre" },
  "keywords": "tag1, tag2, tag3"
}
```

**Avantage**: Google comprend mieux le contenu, meilleur classement SEO.

### 4. Sitemaps dynamiques

Fichier: `/api/sitemap.js` (fonction Vercel, branchée par les rewrites de `vercel.json`).

- `/sitemap.xml` : index des trois fichiers ci-dessous
- `/sitemap-pages.xml` : pages fixes et pages de catégories
- `/sitemap-blog.xml` : articles publiés (avec lastmod)
- `/sitemap-markets.xml` : marchés ouverts

Les listes viennent de la Cloud Function publique `ogData` (`kind=articles-index` et `kind=markets-index`). En cas d'échec, le sitemap répond 503 plutôt qu'un fichier vide.


### 5. Robots.txt

Fichier: `/public/robots.txt`

Configuré pour :
- Autoriser l'indexation du blog et des markets
- Bloquer `/admin` et autres routes privées
- Indiquer les sitemaps
- Respectful crawl-delay

## Intégration

### BlogDetail.jsx

Chaque article blog génère automatiquement :

```jsx
useSEO({
  title: article.title,
  description: article.excerpt,
  image: article.coverImageUrl,
  url: `/blog/${article.slug}`,
  type: 'article',
  structuredData: generateArticleStructuredData(article),
  tags: article.tags,
  publishedDate: article.publishedAt,
});
```

### BlogList.jsx (TODO)

À faire: ajouter useSEO pour la liste d'articles

```jsx
useSEO({
  title: 'Blog - Analyse et actualité',
  description: 'Articles sur les marchés de prédictions et l\'actualité politique, économique',
  url: '/blog',
  type: 'website',
});
```

### Feed.jsx (Homepage - TODO)

À faire: ajouter useSEO pour l'accueil

```jsx
useSEO({
  title: 'Kassandre - Marché de prédictions',
  description: 'Analysez l\'actualité et pariez sur les événements qui comptent',
  url: '/',
  type: 'website',
  structuredData: generateOrganizationStructuredData(),
});
```

## Déploiement
### Sitemaps

Rien à générer à la main : les sitemaps sont servis dynamiquement par `api/sitemap.js`. Après un changement de `functions/`, redéployer `ogData` :

```bash
firebase deploy --only functions:ogData --project kassandre-f868e
```


### Vérification

1. **Google Search Console**: 
   - Va à Google Search Console
   - Ajoute les sitemaps: `/sitemap.xml` et `/sitemap-blog.xml`
   - Coche que les sitemaps sont valides

2. **Valider le XML**:
   ```bash
   curl https://kassandre.app/sitemap-blog.xml | head -10
   ```

3. **Valider les meta tags**:
   - Va sur un article blog
   - Inspect → Head
   - Cherche les `og:`, `twitter:`, et `<script type="application/ld+json">`

## Checklist SEO

- [x] Meta tags dynamiques pour articles
- [x] Open Graph tags
- [x] Twitter Card tags
- [x] Canonical URLs
- [x] JSON-LD structured data (article)
- [x] robots.txt
- [x] Sitemap generator
- [ ] Sitemap deployment (static ou Cloud Functions)
- [ ] Google Search Console integration
- [ ] Breadcrumbs structured data
- [ ] FAQ schema (optionnel)

## Performance

- Meta tags générés côté client (Helmet)
- Structured data ajouté au Helmet (ne ralentit pas le rendu)
- Sitemaps générés à la demande (ou build-time avec Cloud Functions)

## Exemple de partage sur Twitter

Un article avec les meta tags correctement configurés affichera:

```
Titre de l'article | Kassandre
Court résumé de l'article...

[Image de couverture]
kassandre.app
```

Au lieu du rendu par défaut de Twitter.

## Prochaines étapes

1. Déployer les sitemaps statiques (Firebase Function)
2. Ajouter useSEO à BlogList.jsx et Feed.jsx
3. Ajouter breadcrumbs structured data
4. Monitorer les performances Google Search Console
5. Implémenter Open Graph image dynamique si pas de cover

