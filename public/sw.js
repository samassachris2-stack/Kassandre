// Service worker de Kassandre : rend l'application installable et affiche une page
// claire hors connexion. Il ne met en cache que des fichiers statiques : les marchés,
// les soldes et les paris viennent toujours du réseau (Firebase n'est jamais intercepté).
const VERSION = "v1";
const STATIC_CACHE = `kassandre-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kassandre-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, Google, etc. : jamais intercepté
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/og/") || /\.(xml)$/.test(url.pathname)) return;

  // Pages : le réseau d'abord (toujours la dernière version), la page hors connexion en secours.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Fichiers à nom unique (assets/) et icônes : cache d'abord, ils ne changent jamais sous le même nom.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC_CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
