// Service Worker — hors-ligne F12 (partie 2 : consultation complète)
//
// RÈGLE ABSOLUE (bug C-028, v3) : ce service worker ne touche QUE
//   1. les navigations (mode navigate) — réseau d'abord, cache en secours ;
//   2. les fichiers statiques explicites (/_next/static/, /icons/, /favicon) —
//      cache d'abord.
// TOUT le reste — en particulier les fetch de données de Next.js (payloads
// RSC émis par router.refresh(), requêtes internes du routeur) — passe
// directement au navigateur. Les mettre en cache-first présentait des données
// serveur PÉRIMÉES : c'était la cause racine des listes qui ne se mettaient
// pas à jour après une mutation.
//
// F12 FIN (v7) — consultation hors-ligne des DONNÉES en lecture :
//   - les pages de données (/calendar, /recipes, /recipes/<id>...) sont des
//     navigations : elles sont mises en cache au passage (fiche de page
//     complète rendue par le serveur) et resservies hors-ligne ;
//   - l'invalidation au retour en ligne est inhérente au réseau-d'abord :
//     un simple rechargement en ligne réécrit l'entrée du cache avec la
//     donnée fraîche (aucun planning périmé servi au-delà du réseau down) ;
//   - nouvelle page de secours /offline (précachée) pour une navigation
//     jamais visitée : message propre au lieu d'une erreur du navigateur ;
//   - les ÉCRITURES hors-ligne (POST = server actions de Next) échouent
//     proprement : réponse 503 synthétique au lieu d'un rejet réseau brut.
//
// RÈGLE ANTI-DÉRIVE (C-038) : toute modification fait BUMPER la version du
// cache — les caches antérieurs sont purgés à l'activation, en une règle :
// ce fichier doit rester le seul lieu de vérité des versions. La purge
// déconnexion (Nav.tsx) supprime tout cache préfixé « meal-plan- » : ne pas
// changer ce préfixe.
//
// v4 : purge des caches v3 (anciennes icônes). v5 : icône chronomètre.
// v6 : icône neutre (fond noir). v7 : F12 fin — page /offline précachée,
//      secours de navigation vers /offline, échec propre des écritures
//      hors-ligne, MAX_ENTRIES relevé pour les pages de lecture.

const CACHE = 'meal-plan-v7';
const PRECACHE = ['/', '/offline', '/icons/icon-192.png?v=4', '/icons/icon-512.png?v=4'];
const MAX_ENTRIES = 120;

// Seuls ces chemins sont considérés comme des assets cachables
// manifest.json retiré : servi dynamiquement (couleurs du thème F14),
// il ne doit jamais être servi depuis un cache périmé
const ASSET_PATHS = ['/_next/static/', '/icons/', '/favicon.ico'];

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
      // Supprime tous les caches antérieurs : ils peuvent contenir soit des
      // payloads RSC périmés (v1/v2), soit des pages de données anciennes —
      // la donnée re-cachée est uniquement navigation/assets (C-038)
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 0. Écritures (server actions, POST d'API) : laissées au réseau. Hors-ligne,
  //    on renvoie une 503 synthétique plutôt que de laisser le fetch rejeter :
  //    les mutations ne sont JAMAIS mises en cache ni rejouées, et l'app
  //    affiche son état d'erreur propre au lieu d'un crash réseau.
  if (request.method !== 'GET') {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ offline: true, error: 'Hors-ligne : requête impossible.' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        })
      )
    );
    return;
  }

  // 1. Navigations : réseau d'abord (pages toujours à jour après un
  //    déploiement ou un retour en ligne — c'est l'invalidation du cache de
  //    données), cache en secours (consultation hors-ligne), puis page
  //    /offline si la page n'a jamais été visitée. Les URL avec querystring
  //    ne sont pas mises en cache.
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
            .then((cached) => cached || caches.match('/offline'))
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
