// Service Worker — coquille applicative hors-ligne (F12, partie 1 : PWA installable)
//
// Stratégies :
// - navigation : réseau d'abord (pages toujours à jour après une mise à jour),
//   repli sur le cache, puis sur "/" si la page n'a jamais été visitée ;
// - assets (JS/CSS/icônes) : cache d'abord, réseau en secours ;
// - API (dont /api/auth/* de NextAuth) et requêtes non-GET : jamais interceptées.
//
// Croissance bornée : les navigations avec querystring ne sont pas cachées et
// chaque cache est plafonné (FIFO) — les déploiements successifs ajoutent des
// chunks hashés qui, sinon, s'accumuleraient sans limite côté client.
//
// Le mode "consultation hors-ligne complète" (cache des données, synchro au
// retour en ligne) reste à faire — voir ROADMAPV3, phase 4.

const CACHE = 'meal-plan-v2';
const PRECACHE = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];
const MAX_ENTRIES = 60;

async function boundedPut(cache, request, response) {
  await cache.put(request, response);
  const keys = await cache.keys();
  if (keys.length > MAX_ENTRIES) {
    // keys() suit l'ordre d'insertion : les plus anciennes d'abord
    for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) {
      await cache.delete(key);
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation : réseau d'abord, cache en secours. Les URL avec querystring
  // (/login?callbackUrl=…) ne sont jamais mises en cache : une clé par URL
  // ferait exploser le cache et servirait des états périmés.
  if (request.mode === 'navigate') {
    if (url.search) {
      // Pas de cache possible : juste réseau, repli sur "/" hors-ligne
      event.respondWith(
        fetch(request).catch(() =>
          caches.match('/'))
      );
      return;
    }
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then((cache) => boundedPut(cache, request, copy))
          );
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Assets : cache d'abord, réseau en secours
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then((cache) => boundedPut(cache, request, copy))
          );
          return response;
        })
    )
  );
});
