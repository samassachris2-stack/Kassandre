// Petits outils partagés par la liste du blog et les pages d'article.

// Temps de lecture estimé (200 mots par minute), à partir du HTML de l'article.
export function readingMinutes(html) {
  const text = String(html || "").replace(/<[^>]*>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Pour une recherche insensible aux accents et à la casse.
export function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Thèmes (tags) triés par nombre d'articles, avec leur effectif.
export function tagCounts(articles) {
  const map = new Map();
  articles.forEach((a) => (a.tags || []).forEach((t) => map.set(t, (map.get(t) || 0) + 1)));
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
}

export function matchesQuery(article, q) {
  const needle = normalize(q).trim();
  if (!needle) return true;
  const hay = normalize([article.title, article.excerpt, ...(article.tags || [])].join(" "));
  return needle.split(/\s+/).every((word) => hay.includes(word));
}

// Articles proches : on classe par nombre de thèmes communs, puis par date.
// `articles` est supposé trié du plus récent au plus ancien.
export function relatedArticles(current, articles, count = 3) {
  const mine = new Set(current.tags || []);
  return articles
    .filter((a) => a.id !== current.id)
    .map((a, i) => ({ a, shared: (a.tags || []).filter((t) => mine.has(t)).length, i }))
    .sort((x, y) => y.shared - x.shared || x.i - y.i)
    .slice(0, count)
    .map((x) => x.a);
}
