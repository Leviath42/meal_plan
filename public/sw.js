// Service Worker — coquille applicative hors-ligne (F12, partie 1 : PWA installable)
//
// RÈGLE ABSOLUE (bug C-028, v3) : ce service worker ne touche QUE
//   1. les navigations (mode navigate) — réseau d'abord, cache en secours ;
//   2. les fichiers statiques explicites (/_next/static/, /icons/, manifest) —
//      cache d'abord.
// TOUT le reste — en particulier les fetch de données de Next.js (payloads
// RSC émis par router.refresh(), requêtes internes du routeur) — passe
// directement au navigateur. Les mettre en cache-first présentait des données
// serveur PÉRIMÉES : c'était la cause racine des listes qui ne se mettaient
// pas à jour après une mutation.
//
// Le mode "consultation hors-ligne complète" reste à faire — ROADMAPV3, phase 4.

const CACHE = 'meal-plan-v3';
const PRECACHE = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];
const MAX_ENTRIES = 60;

// Seuls ces chemins sont considérés comme des assets cachables
const ASSET_PATHS = ['/_next/static/', '/icons/', '/manifest.json', '/favicon.ico'];

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
      // Supprime aussi les caches v1/v2 : ils contiennent des payloads RSC
      // périmés — la donnée re-cachée par la v3 est uniquement navigation/assets
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1. Navigations : réseau d'abord (pages toujours à jour après un
  //    déploiement), cache en secours, puis "/" si la page n'a jamais été
  //    visitée. Les URL avec querystring ne sont pas mises en cache.
  if (request.mode === 'navigate') {
    if (url.search) {
      event.respondWith(
        fetch(request).catch(() => caches.match('/'))
      );
      return;
    }
    event.respondWith(
      fetch(request)
        .then((response) => {
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

  // 2. Fichiers statiques explicites uniquement : cache d'abord.
  //    TOUT autre GET — notamment les fetch RSC de Next.js (router.refresh,
  //    navigations internes) — n'est PAS intercepté : les données serveur
  //    ne doivent jamais être servies depuis un cache.
  if (!ASSET_PATHS.some((path) => url.pathname.startsWith(path))) {
    return;
  }

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
