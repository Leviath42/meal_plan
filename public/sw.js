// Service Worker — coquille applicative hors-ligne (F12, partie 1 : PWA installable)
//
// Stratégies :
// - navigation : réseau d'abord (pages toujours à jour après une mise à jour),
//   repli sur le cache, puis sur "/" si la page n'a jamais été visitée ;
// - assets (JS/CSS/icônes) : cache d'abord, réseau en secours ;
// - API (dont /api/auth/* de NextAuth) et requêtes non-GET : jamais interceptées.
//
// Le mode "consultation hors-ligne complète" (cache des données, synchro au
// retour en ligne) reste à faire — voir ROADMAPV3, phase 4.

const CACHE = 'meal-plan-v1';
const PRECACHE = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

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

  // Navigation : réseau d'abord, cache en secours
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
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
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
          return response;
        })
    )
  );
});
