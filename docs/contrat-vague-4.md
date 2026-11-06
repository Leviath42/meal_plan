# Contrat de la vague 4 — Phase 4 « confort & données » (figé avant workers)

*Base : `beta` @ 45fd6e3 (roadmap v3.15). Règle du processus : ce contrat est mergé sur `beta` AVANT le lancement des workers ; toute évolution passe par une nouvelle PR.*

Deux vagues distinctes :
- **Vague 4a (parallèle, ce contrat)** : F10+F12 (worker W1), F11 (W2), F15 (W3), F16 (W4), F18 (W5) — fichiers majoritairement nouveaux, périmètres disjoints figés ci-dessous ;
- **Vague 4b (séquentielle, après les fusions 4a)** : **F17 multi-tenant `household_id`** — chantier prioritaire confirmé le 06/11/2026, il touche TOUTES les tables/actions : il se fait SEUL, sur `feature/multi-tenant-household`, avec son propre contrat (cascade `household_id`, backfill foyer unique, isolation en requête). Jamais en parallèle d'autres workers.

**OAuth (Google/GitHub) reste bloqué** sur les variables d'environnement propriétaire — hors vague jusqu'à livraison des secrets. **F18 export** est prioritaire (le contrat v3 impose déjà « export JSON autorisé » en essai expiré).

---

## 1. Schéma figé (migration `0008_talented_chat`, générée par `db:generate`)

- `households` : `id`, `name`, `created_at`. La table est posée MAIS la cascade (colonnes + isolation) relève de la vague 4b.
- `users.household_id` (null tant que 4b n'a pas backfillé) + `users.notify_time` (heure locale « HH:MM » du rappel F10, null = désactivé).
- `push_subscriptions` : `user_id`→users (cascade), `endpoint` **unique**, `p256dh`, `auth` (Web Push, VAPID).
- `pantry_items` : `ingredient_id` **unique**→ingredients (cascade), `quantity` (real), `unit`, `expires_at` (ISO date, null).
- `feedback` : `user_id`→users (cascade), `category` (bug | idee | question | prix), `message`, `page_url`, `app_version`, `status` (nouveau | trie | traite | rejete, défaut nouveau).
- `ingredient_standards` : `ingredient_id` **unique**→ingredients (cascade), `quantity` (real), `unit`, `servings_ref` (défaut 4).

**Interdits pour les workers** : toute modification de `lib/db/schema.ts`, `drizzle/`, `package.json`, `.github/workflows/ci.yml`, `app/Nav.tsx` (la nav est déjà figée : « Garde-manger » → `/pantry`, « Retours » → `/feedback`). Les liens seront 404 entre le merge du contrat et celui de leur feature — c'est accepté sur le CT beta, l'ordre de fusion ci-dessous garantit qu'aucun lien mort n'atteint `main`.

## 2. Routes figées

| Route | Worker | Rôle |
|---|---|---|
| `GET /pantry` | W2 | Garde-manger : liste/saisie des quantités en stock, péremption, intégration courses (articles en stock exclus de la génération) |
| `GET /feedback` | W3 | Formulaire de retour 3-clics (catégorie, message, envoyer) — page publique en session uniquement |
| `GET /admin/feedback` (ADMIN) | W3 | Tri des retours : liste filtrable, changement de statut, compteur par catégorie |
| `GET /recipes/new` + edit | W4 | Pré-remplissage des quantités d'ingrédients depuis les standards selon les couverts saisis |
| `POST /api/export` ou action `exportAllData` (W5) | W5 | Export JSON complet (recettes, ingrédients, planning, garde-manger, paramètres — JAMAIS les mots de passe ni jetons) ; `POST /api/import` ou action `importAllData` avec validation + transaction |
| `GET /api/notifications/subscribe` + `POST /api/notifications/push` | W1 | Abonnement Web Push (VAPID, `web-push` npm autorisé à W1 uniquement) + envoi du rappel du jour (endpoint protégé par `NOTIFICATIONS_SECRET`, appelé par cron système — runbook `.env.local` + docs/deploiement-proxmox.md par W1) |
| `public/sw.js` | W1 | Cache des données (recettes/ingrédients/calendrier en lecture) + synchronisation au retour en ligne — **bump de version SW obligatoire dans le même commit** |

F10 heure de rappel : section « Notifications » dans `/profile` (W1) ; F18 : section « Export/Import » dans `/settings` (W5, ADMIN). Zones UI disjointes, aucun autre worker ne touche `/profile` ni `/settings`.

## 3. Workers (un par chantier, worktree + branche `feature/*` dédiés)

| Worker | Branche | Fichiers autorisés | Interdits (en plus du §1) | Critères d'acceptation |
|---|---|---|---|---|
| **W1 — F10 notifications + F12 complément** | `feature/f10-f12-notifications` | `public/sw.js`, `app/api/notifications/**`, `app/profile/**` (section notifications), `lib/notifications.ts`, pages offline (`app/offline/**`), docs déploiement (cron/VAPID) | actions des autres features, `/settings`, pantry | SW v+1 avec purge des caches antérieurs ; offline : calendrier + recettes consultables ; push : envoi réel testé (mock endpoint au minimum), essai « désactiver » respecté ; **test runtime** `scripts/test-notifications.ts` (sqlite jetable — abonnement stocké, exclusion heure null) |
| **W2 — F11 garde-manger** | `feature/f11-garde-manger` | `app/pantry/**`, `app/actions/pantry.ts`, `app/actions/shopping.ts` (exclusion du stock), `app/shopping-list/**` (infolettre stock), `lib/validators/pantry.ts` | schéma, nav, `/settings`, `/profile` | CRUD stock (quantité décimale, unité, péremption) ; génération de courses excluant le stock (recette nécessitant 500 g dont 200 g en stock → 300 g demandés) ; péremption dépassée = alerte visuelle ; **test runtime** `scripts/test-pantry.ts` (écriture + exclusion en transaction, sqlite jetable) |
| **W3 — F15 feedback** | `feature/f15-feedback` | `app/feedback/**`, `app/actions/feedback.ts`, `app/admin/feedback/**`, `lib/rate-limit.ts` (réutilisation), `lib/validators/feedback.ts` | schéma, nav, pages métier | Envoi en 3 clics max, Zod + rate limit par utilisateur (5/h), `page_url` + `app_version` capturés côté serveur ; page admin : statuts, filtres, compteurs ; intra-session GUEST refusé ; **test runtime** `scripts/test-feedback.ts` |
| **W4 — F16 quantités standard** | `feature/f16-standards-quantite` | `app/recipes/new/**`, `app/recipes/[id]/edit/**`, `lib/standards.ts`, `scripts/seed-standards.ts` (~30 ingrédients courants, `INSERT OR IGNORE` idempotent) | schéma, nav, actions shopping | Le sélecteur d'ingrédient propose la quantité standard mise à l'échelle des couverts (400 g pour 4 si standard = 100 g/pers.), ajustable ; sans standard = comportement actuel inchangé ; **test runtime** `scripts/test-standards.ts` (calcul de mise à l'échelle pur) |
| **W5 — F18 export/import JSON** | `feature/f18-export-import` | `lib/export.ts`, `lib/import.ts`, `app/actions/export.ts`, UI dans `app/settings/**` (section ADMIN) | schéma, nav, autres pages | Export : un JSON daté+versionné de TOUT (recettes, ingrédients, liaison recette-ingrédient, planning, stock, paramètres) hors secrets ; Import : transaction atomique (tout ou rien), doublons de titre suffixés, atomicité testée (échec au milieu = rien écrit) ; export autorisé en essai expiré (cohérent contrat v3) ; **test runtime** `scripts/test-export.ts` |

## 4. Ordre de fusion sur `beta` (séquentielle, chef de projet)

1. Ce contrat (schéma 0008 + nav + docs). 2. **W2 (F11)** — touche les actions courses. 3. **W3 (F15)**. 4. **W4 (F16)** — touche les formulaires. 5. **W5 (F18)** — touche /settings. 6. **W1 (F10+F12)** — touche `sw.js` global, TOUJOURS en dernier. 7. Vague 4b : contrat F17 puis worker **W6 (multi-tenant)**.

## 5. Gates qualité (obligatoires — voir [test-plan-vague-4.md](test-plan-vague-4.md) pour le détail)

1. `npx eslint .` clean ; 2. `tsc --noEmit` clean ; 3. `npm run build` OK ; 4. **test runtime dédié en exécution** (`scripts/test-<feature>.ts`, sqlite jetable via `SQLITE_PATH`, pattern des scripts existants : cf. `scripts/test-import-recipe.ts`, numéroter les PASS, exit 1 au premier FAIL) ; 5. `npm test` (smoke 9) + tests dédiés des features déjà mergées restent verts ; 6. aucune classe `dark:` dans le nouveau code UI (le remappage `:root.dark` de `globals.css` gère le mode sombre — leçon C-053) ; 7. Zod sur toute entrée serveur + `requireSession`/`requireAdmin` dans toute action ; 8. pas d'`ilike()` drizzle (inexistant en SQLite — leçon C-055), unicast insensible à la casse via `lib/recipe-import-db.ts` ou `LOWER()` ; 9. pas de secret dans le code ; 10. commit français (`feat:`/`fix:`/`docs:`), correctif C-057+ au `docs/correctifs.md` + docs associées DANS LE MÊME commit ; 11. tailles : pages suivent le gabarit `max-w-2xl` / composants existants (CollapsibleSection, SearchSelect), textuelle cohérente.

Le chef de projet ajoute les scripts `npm run test:<feature>` et les lignes CI correspondantes **au moment de chaque fusion** (les workers ne touchent ni `package.json` ni `ci.yml`).

## 6. Carnet de bord des workers

Chaque worker, à la fin de sa mission, ajoute une ligne à son tableau ci-dessous dans le même PR (branche + statut + test(s) + ce qui reste) — le chef de projet vérifie chaque ligne avant fusion.

| Worker | Branche | Statut | Tests runtime | Reste |
|---|---|---|---|---|
| W1 — F10 notifications + F12 fin | `feature/f10-f12-notifications` | Livré (C-061) — push -u origin, en attente de fusion (dernier selon §4) | `scripts/test-notifications.ts` 27 PASS (sqlite jetable : upsert abonnement, exclusion `notify_time` null, repas du jour Paris, requête push VAPID chiffrée sur mock endpoint) ; smoke 9, import 32, onboarding 3, license 15 ; eslint + tsc + build OK | Chef de projet : `npm run test:notifications` + ligne CI à l'ajout (package.json/ci.yml interdits au worker) ; push réel vers Chrome à la validation humaine (N1→N3) ; O1→O4 à vérifier sur appareil ; clé VAPID de PROD à générer au CT (runbook `docs/deploiement-proxmox.md`), valeurs DEV jamais commitées |
