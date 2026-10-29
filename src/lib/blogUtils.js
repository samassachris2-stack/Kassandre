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

// Vidéos intégrées : un lien YouTube, TikTok, Instagram ou X/Twitter seul sur
// sa ligne (ou écrit [video:URL]) devient un lecteur dans l'article.
function embedHtml(rawUrl) {
  let u;
  try { u = new URL(rawUrl.replace(/&amp;/g, "&")); } catch { return null; }
  const host = u.hostname.replace(/^(www\.|m\.|mobile\.)/, "");
  const path = u.pathname;
  const wrap = (src, ratio, max, title) =>
    `<div class="video-embed" style="margin:24px auto;max-width:${max}px">` +
    `<div style="position:relative;width:100%;${ratio}">` +
    `<iframe src="${src}" title="${title}" loading="lazy" allowfullscreen ` +
    `allow="autoplay; encrypted-media; picture-in-picture; clipboard-write" ` +
    `style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px;background:var(--k-inset)"></iframe>` +
    `</div></div>`;
  let m;
  if (host === "youtu.be") m = path.match(/^\/([\w-]{6,})/);
  else if (host.endsWith("youtube.com")) {
    m = path.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/);
    if (!m && u.searchParams.get("v")) m = [null, u.searchParams.get("v")];
  }
  if (m && /^[\w-]{6,}$/.test(m[1])) {
    const shorts = /\/shorts\//.test(path);
    return wrap(`https://www.youtube-nocookie.com/embed/${m[1]}`, shorts ? "aspect-ratio:9/16" : "aspect-ratio:16/9", shorts ? 360 : 720, "Vidéo YouTube");
  }
  if (host.endsWith("tiktok.com")) {
    m = path.match(/\/video\/(\d+)/);
    if (m) return wrap(`https://www.tiktok.com/embed/v2/${m[1]}`, "height:740px", 340, "Vidéo TikTok");
  }
  if (host.endsWith("instagram.com")) {
    m = path.match(/\/(p|reel|reels|tv)\/([\w-]+)/);
    if (m) return wrap(`https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/embed/`, "height:620px", 400, "Publication Instagram");
  }
  if (host === "x.com" || host.endsWith("twitter.com")) {
    m = path.match(/\/status\/(\d+)/);
    if (m) return wrap(`https://platform.twitter.com/embed/Tweet.html?id=${m[1]}&theme=dark&dnt=true`, "height:520px", 550, "Publication X");
  }
  return null;
}

export function embedVideos(html) {
  const src = String(html || "");
  const alone = /<p>\s*(?:<a\s[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>|(https?:\/\/[^\s<]+)|\[video:\s*([^\]\s]+)\s*\])\s*<\/p>/gi;
  return src.replace(alone, (full, a, b, c) => embedHtml(a || b || c) || full);
}
