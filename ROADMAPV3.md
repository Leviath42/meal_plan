# Meal Plan - ROADMAP V3 - État Réel et Suite du Projet

*Dernière mise à jour : 2026-10-08*
*Version : 3.1 — Les versions précédentes sont archivées dans [archives/](archives/)*
*Basé sur : [meal_plan_requirements.md](meal_plan_requirements.md) (cahier des charges)*

---

## 📋 Résumé du Projet

Application web **familiale** de planification des repas et gestion de recettes.

**Objectif principal** : Planifier les repas sur un calendrier, gérer un livre de recettes local, générer automatiquement les listes de courses et partager le planning, sans coût d'abonnement.

**Accès** : Fluide à la maison comme à l'extérieur (ex. consultation de la liste de courses au supermarché, via tunnel Cloudflare).

---

## 🎯 Rôles et Permissions

| Rôle | Accès | Description |
|------|-------|-------------|
| **ADMIN** | Lecture + Écriture + Gestion | Gère les comptes, les jetons de partage, les paramètres globaux |
| **MEMBER** | Lecture + Écriture | Recettes, planning, liste de courses, ses propres préférences |
| **GUEST** | Aucun | Compte en attente de validation par un ADMIN |

---

## 📊 État du Projet — Phases 1 à 3 TERMINÉES

### ✅ Fonctionnalités implémentées et livrées sur `beta`

| Phase | Fonctionnalité | État | Notes de validation |
|-------|---------------|------|---------------------|
| 1 | **F01 - Planification** | ✅ Complet | CRUD, DnD, navigation jour/mois, modals — validé en usage réel |
| 1 | F01 options — palette drag&drop, page `/settings`, correctifs menu/dates | ✅ Complet | À valider en campagne de tests |
| 1 | F01 — version prod Proxmox + tunnel Cloudflare | ✅ En service | CT 103, `update.sh` pour les mises à jour |
| 2 | **F05 - Liste de courses** | ✅ Complet | Génération validée en réel (échelle des couverts, rayons, fusion) |
| 2 | **F04 - Partage** | ✅ Complet | Jetons, page publique, ICS, API JSON HA — test partiel effectué (jeton actif) |
| 3 | **F08 - Historique** | ✅ Complet | `lastServedAt`, indicateur dans le calendrier — 6 tests runtime PASS |
| 3 | **F09 - Antidoublon** | ✅ Complet | Fenêtre configurable par utilisateur — 10 tests runtime PASS |
| 3 | **F03 - Suggestions** | ✅ Complet | 3 propositions excluant la fenêtre antidoublon — 9 tests runtime PASS |
| - | Auth, recettes, ingrédients, profil, admin | ✅ Complet | Audits de sécurité passés |
| - | **Navigation des catalogues** — sections repliables par catégorie (recettes par type de plat, ingrédients par rayon, liste de courses par rayon) + recherche texte sur recettes (titre/description/tags/type) et ingrédients (nom/rayon), via `CollapsibleSection` partagé | ✅ Livré | À valider sur téléphone |
| - | **Maintenance intégrée** — page `/deploy` (version chargée, mise à jour, rollback) + `update.sh` + `db:ensure` | ✅ En service | Déployé et testé sur le CT beta |
| 4 | **F12 (partie 1)** — PWA installable : manifest, icônes maskable, Service Worker (coquille hors-ligne) | ✅ Livré | À valider sur Android : installation + ouverture hors-ligne |

### 📌 Stack Technique

| Couche | Technologie |
|-------|-------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | Tailwind CSS v4, mode sombre par remappage de palette |
| ORM | Drizzle ORM + migrations versionnées (`drizzle/`) |
| Base de données | SQLite (better-sqlite3) — un seul fichier `data/sqlite.db` |
| Authentification | NextAuth v5 (JWT), rôles revalidés en base à chaque action |
| Hashage | Argon2 |
| Validation | Zod v4 |
| Drag & drop | @dnd-kit |

---

## 🤖 Processus de développement — vagues IA supervisées

Le projet se développe par **vagues de travail parallèle** orchestrées par un agent chef de projet :

1. **Contrat** : tout ce qui est partagé (schéma DB, migration, liens de navigation, routes publiques) est figé et committé sur `beta` AVANT le lancement des workers ;
2. **Workers** : un agent par fonctionnalité, sur un `git worktree` et une branche `feature/*` dédiés, avec mission bornée (liste de fichiers autorisés/interdits, spec, critères d'acceptation) ;
3. **Portes de qualité** : `tsc` + `build` + **tests d'exécution réels** (toute action serveur qui écrit en base doit être testée en runtime — tsc/build ne détectent pas, par ex., les transactions async refusées par better-sqlite3) ;
4. **Fusion séquentielle** : `beta` ← une branche à la fois, vérification de conformité par le chef de projet avant chaque merge ;
5. **Validation humaine** : tests sur le conteneur Proxmox, promotion `beta → main` et tag `last-stable` sur décision du propriétaire.

Historique des vagues : **V1** (F05 + F04 + F01-options, 3 workers), **V2** (F08 + F09 + F03, couloir unique).

---

## 🧪 Campagne de tests en cours (validation humaine)

Checklists de validation restantes, fonctionnalité par fonctionnalité :

### F04 — Partage
- [ ] Créer un jeton depuis `/share` (ADMIN) ; ouvrir le lien public en navigation privée
- [ ] Révoquer le jeton → recharger → « Lien invalide ou expiré »
- [ ] Télécharger l'ICS (`/api/calendar/ics?token=…`) et l'importer dans un agenda
- [ ] API JSON (`/api/calendar/public?token=…`) — test Home Assistant
- [ ] `/share` en tant que MEMBER → redirection vers l'accueil

### F01 options
- [ ] Palette « Recettes » sur `/calendar` : glisser une recette dans un créneau vide, un en-tête de date, une cellule jour+type
- [ ] Refus des dates passées depuis la palette ; rien n'est supprimable depuis la palette
- [ ] Info-bulles des badges (temps de préparation/cuisson) et suffixe type de plat
- [ ] Menu mobile : clic extérieur, touche Échap, navigation par les liens
- [ ] `/settings` : ADMIN modifie les couverts par défaut → pré-remplissage du modal de création ; MEMBER en lecture seule

### Phase 3 (F08 / F09 / F03)
- [ ] Planifier une recette, tenter de la replanir à J+3 → refus ; à J+8 → accepté ; contrôle désactivé (0) → accepté *(fenêtre exclusive depuis C-023 : à X=7, J+7 exactement est aussi accepté)*
- [ ] Badge « • » déjà servi + info-bulle ; ligne « Dernier repas planifié » sur la page recette
- [ ] Bouton « Suggérer » du modal de création : les propositions excluent la fenêtre antidoublon ; cas d'échec (petit catalogue / intervalle élevé)
- [ ] `/settings` → « Mes préférences » : intervalle antidoublon enregistrable par un MEMBER

### Général
- [ ] Parcours complet sur téléphone (via tunnel Cloudflare) : chaque page, chaque formulaire, mode sombre
- [ ] Deux comptes simultanés (ADMIN + MEMBER) : permissions réelles de chaque rôle

---

## 🛠️ Section CORRECTIONS — à alimenter pendant les tests

> **Mode d'emploi** : pendant la campagne de tests, ajoute une ligne par problème rencontré. Format libre mais les cinq premières colonnes aident la priorisation. Chaque vague de correction traite les lignes « À corriger », puis passe le statut en « Corrigé » avec le commit de référence.

| ID | Date | Fonctionnalité / Page | Description du problème (étapes → attendu → constaté) | Statut | Priorité |
|----|------|------------------------|--------------------------------------------------------|--------|----------|
| C-001 | 2026-10-07 | F05 - Liste de courses | Quantités affichées en décimales brutes (ex. « 2.667 filet », « 333.333 g ») | Corrigé (formateur partagé `lib/format.ts` : 2 décimales, virgule FR, zéros trimés — appliqué liste de courses, détail recette et sélecteur d'ingrédients) | Basse |
| C-002 | 2026-10-08 | Nav mobile | Lien « Courses » sans `py-2` → espacement non uniforme entre les items (desktop ok) | Corrigé (commit en cours) | Basse |
| C-003 | 2026-10-08 | Nav mobile | Menu resté ouvert au clic sur le logo « Meal Plan » | Corrigé (f551a2b) | Basse |
| C-004 | 2026-10-08 | Base / migrations | Journal `__drizzle_migrations` hérité de l'ancien jeu de migrations : `db:migrate` silencieusement inopérant, colonnes `last_served_at` / `min_days_between` et tables `access_tokens` / `app_settings` absentes des bases restaurées | Corrigé (f31674e : `db:ensure` + réalignement du journal) | Haute |
| C-005 | 2026-10-08 | Déploiement | Processus de mise à jour lancé depuis l'app tué au `pm2 stop` (tree-kill de pm2) → site laissé en 502 | Corrigé (3068e83 : double-fork, script reparenté à init) | Haute |
| C-006 | 2026-10-08 | F04 - Partage | Page /share basculait en mode clair à l'actualisation. Première piste (erreur d'hydratation dates) : correctifs conservés mais insuffisants — le bug persistait | Corrigé en solution 2 : thème rendu côté serveur depuis le cookie `meal-theme` (classe .dark dans le HTML initial, ThemeToggle écrit le cookie, script de secours uniquement sans cookie). Vérifié en prod locale : `class="dark"` servi avec le cookie. Aucun coût (layout déjà dynamique) | Haute |
| C-007 | 2026-10-08 | Base | `PRAGMA foreign_keys` jamais activé : toutes les clauses ON DELETE du schéma inertes (suppression de recette → repas orphelins qui alimentent encore la liste de courses ; suppression d'ingrédient utilisé réussissait en silence) — trouvé indépendamment par 2 agents d'audit | Corrigé (pragma dans `lib/db/index.ts` + purge idempotente des orphelins dans `db-ensure`, testée en runtime : cascade, set null, 4 purges) | Critique |
| C-008 | 2026-10-08 | F05 - Liste de courses | Régénération : toutes les cases cochées des articles générées étaient effacées | Corrigé (coches conservées par clé ingrédient+unité, testées en runtime) | Haute |
| C-009 | 2026-10-08 | Sécurité | Server actions non gardées : `getMealPlans`, `getAppSettings` (+ course à l'insertion), `getCurrentUserMinDaysBetween` invocables anonymement (le middleware protège les pages, pas les actions) | Corrigé (`requireSession()` partout + `onConflictDoNothing`) | Haute |
| C-010 | 2026-10-08 | Sécurité | Reset par question secrète : brute force illimité, message d'échec confirmant l'existence du compte, question révélée sans limite | Corrigé (`lib/rate-limit.ts` : 5 essais/h sur le reset, 10/h sur la question, message neutre unique — testé en runtime) | Haute |
| C-011 | 2026-10-08 | Sécurité | `data/sqlite.db` suivie dans git (emails, hashes Argon2, questions secrètes, jetons en clair) | Corrigé pour l'avenir (`git rm --cached` + .gitignore) ; l'historique git conserve les versions passées — purge `git filter-repo` + révocation des jetons à décider | Critique |
| C-012 | 2026-10-08 | F04 - Partage | Jetons d'accès stockés en clair en base (et renvoyés en clair à l'UI admin) : toute lecture de la base les rend utilisables | Corrigé (stockage `sha256:<hash>`, valeur claire montrée UNE fois à la création avec les liens, migration automatique des jetons existants via `db:ensure` — testée en runtime, `expiresInDays` validé Zod) | Haute |
| C-013 | 2026-10-08 | Sécurité | Aucun en-tête de sécurité HTTP (clickjacking possible, `?token=` fugetant dans les Referer sortants) | Corrigé (`next.config.ts` : X-Frame-Options DENY, nosniff, Referrer-Policy no-referrer, Permissions-Policy — vérifiés en prod locale ; CSP différée : script inline du thème) | Moyenne |
| C-014 | 2026-10-08 | Page /deploy | Polling toutes les 3 s : 3 `execSync` git + lecture du log complet bloquaient l'event loop du serveur pour tous les utilisateurs | Corrigé (infos git en cache 30 s, lecture bornée aux 16 derniers Ko, intervalle adaptatif 1,5 s en déploiement / 30 s au repos, journal réservé ADMIN) | Haute |
| C-015 | 2026-10-08 | update.sh | Healthcheck : n'importe quel code HTTP ≠ 000 passait pour un succès (500 inclus) | Corrigé (codes 2xx/3xx explicites, sinon `die` avec consigne de rollback) | Moyenne |
| C-016 | 2026-10-08 | Page Utilisateurs | `getAllUsers` envoyait les hashes Argon2 de mots de passe et de réponses secrètes jusqu'au navigateur | Corrigé (projection stricte : id, email, name, role, createdAt) | Moyenne |
| C-017 | 2026-10-08 | F04 - ICS / API JSON | Tri par type de repas sur TOUTE la période : tous les petits-déjeuners des 90 jours arrivaient avant tous les déjeuners | Corrigé (tri par date puis type — export ICS et API JSON désormais chronologiques) | Basse |
| C-018 | 2026-10-08 | Sécurité | Aucun rate limiting sur login/register (Argon2 ~40-100 ms/essai = DoS CPU) ; actions de profil avec `auth()` au lieu de `requireSession` | Corrigé (limites 10/15 min sur login par email, 5/h sur register par IP, `requireSession` sur updateUserPassword/updateUserSecurityQuestion, emails retirés des logs serveur) | Haute |
| C-019 | 2026-10-08 | Base | Aucun index sur les colonnes filtrées (meal_plans.date à chaque navigation, recipe_id pour l'antidoublon, recipe_ingredients.recipe_id) ; aucun contrôle d'unicité du créneau (date+type+recette) → doublons possibles et quantités doublées dans la liste de courses | Corrigé (migration 0003 : 3 index + index unique ; déduplication automatique des doublons existants dans `db:ensure` AVANT la création de l'index — testée en runtime : 3 PASS + idempotence) | Moyenne |
| C-020 | 2026-10-08 | PWA / SW | Cache navigateur en croissance illimitée (chunks hashés des déploiements successifs) ; pages authentifiées conservées dans le Cache Storage après déconnexion | Corrigé (cache plafonné à 60 entrées FIFO, navigations à querystring non cachées, purge des caches à la déconnexion dans la nav et la page Profil) | Basse |
| C-021 | 2026-10-08 | Middleware | `auth()` exécuté sur chaque asset statique (~1 ms/req) ; correspondance de routes par préfixe sans délimiteur ('/login' couvrait '/login-nimportequoi') | Corrigé (`config.matcher` excluant assets + API auth ; correspondance exacte ou préfixe avec '/'; `SessionProvider` inutilisé retiré du layout) | Basse |
| C-022 | 2026-10-08 | Base / update.sh | Pas de WAL ni busy_timeout (SQLITE_BUSY immédiat si db:ensure tourne pendant l'app) ; sauvegardes sans gestion des fichiers -wal/-shm ; droits des fichiers | Corrigé (WAL + busy_timeout 5 s dans `lib/db/index.ts` ; update.sh sauvegarde/restaure l'ensemble db+wal+shm en supprimant les résidus avant restauration, `chmod 600` des sauvegardes) | Basse |
| C-023 | 2026-10-08 | F09/F03 | Fenêtre antidoublon INCLUSIVE : deux plans espacés d'exactement X jours refusés alors que la règle affichée dit « à moins de X jours » | Corrigé (fenêtre exclusive `gt/lt` — J et J+X acceptés ; sémantique alignée entre antidoublon et suggestions) | Basse |
| C-024 | 2026-10-08 | F04 / courses | Fenêtres +90/+30 jours calculées en millisecondes → décalage d'un jour aux changements d'heure | Corrigé (arithmétique calendaire `setDate` dans ICS, API JSON et page publique — même pattern que la génération de courses) | Basse |
| C-025 | 2026-10-08 | Sécurité | Sessions de 30 jours non révocables ; mots de passe acceptés à partir de 6 caractères (validator, reset et profil incohérents ; `updateUserPassword` sans aucune validation serveur) | Corrigé (maxAge 7 jours ; borne à 10 caractères partout : validator Zod, reset, profil, validation serveur ajoutée à `updateUserPassword`) | Moyenne |
| C-026 | 2026-10-08 | Transverse | Lot de petites corrections : `getMealPlans` avalait les erreurs (calendrier vide silencieux) ; course entre chargements du PlannerBoard ; `parseInt`/`parseFloat` silencieux ; `JSON.parse` du champ ingredients sans garde ; erreurs Zod prepTime/cookTime/defaultServings/mealCourse jamais affichées ; promesses non catchées (suppression recette) ; input quantité min=0 vs validateur ; projection manquante sur /recipes ; `revalidatePath` incomplets ('/' et /calendar) ; `mealType` non contraint par enum ; deps @dnd-kit/sortable+utilities jamais importées ; installateur écrasant update.sh par une version naïve | Corrigé (tout traité — build + TypeScript OK) | Basse |
| C-027 | 2026-10-08 | Profil / Reset | Le gestionnaire de mots de passe du navigateur traitait les formulaires de question secrète comme des connexions : remplissage automatique des champs question/réponse avec email+mot de passe (profil), et sauvegarde de la RÉPONSE comme identifiant → réapparue dans le champ email de la connexion | Corrigé (profil : question/réponse en champs texte + `autoComplete="off"` — plus aucun champ password dans le formulaire, il est ignoré du gestionnaire ; reset : champ « Compte » readonly `autoComplete="username"` pour lier le nouveau mot de passe au bon email + `new-password` partout ; login `username`/`current-password`, register `username`/`new-password`) — RENFORT RETIRÉ (rollback de `44bfa82`) : `readOnly`-jusqu-au-focus + `new-password` sans effet mesuré et risque UX ; CONCLUSION : le remplissage automatique des champs par le navigateur (Chrome assumant que « l'utilisateur sait mieux que le site ») NE PEUT PAS être interdit depuis le site — les champs sont servis vides par le serveur, le remplissage provient des entrées sauvegardées du navigateur. Traitement côté appareil : supprimer l'identifiant parasite dans le gestionnaire de mots de passe et désactiver le remplissage pour ce site dans les paramètres du navigateur. Conservés (sans risque) : champs texte + `off` sur le formulaire de question secrète, marqueur « Compte » sur le reset (empêche la réponse d'être sauvegardée comme identifiant), attributs `username`/`current-password`/`new-password` sur login/register/changement de mot de passe | Moyenne |
| C-028 | 2026-10-08 | Page Utilisateurs | Après promotion/rétrogradation (ou création/suppression), badges, couleurs et compteurs de filtres restaient périmés jusqu'à un rechargement manuel, de façon aléatoire | Corrigé (la liste vit dans l'état du composant et est rechargée explicitement via `getAllUsers()` après chaque mutation réussie ; `router.refresh()` seul est insuffisant — son re-fetch peut être servi depuis le cache du routeur, d'où l'aléa) | Moyenne |
| C-029 | 2026-10-08 | PWA / SW — CAUSE RACINE de C-028 | Le service worker traitait les fetch de données RSC de Next.js (émis par router.refresh()) comme des ASSETS en cache-first → il renvoyait le payload serveur du premier passage, figé : listes périmées après mutation, aléatoire tant le cache se remplissait puis systématique une fois rempli. Apparu avec le déploiement de la PWA (sw.js v1/v2) | Corrigé (sw.js v3 : le SW n'intercepte PLUS QUE les navigations et les fichiers statiques explicites /_next/static/, /icons/, manifest — tout autre GET, notamment RSC, passe directement au navigateur ; caches v1/v2 purgés à l'activation ; syntaxe vérifiée, build OK). Le correctif client de C-028 (rechargement explicite via getAllUsers) est conservé | Haute |
| C-002 | | | | | |

*Statuts : `À corriger` / `En cours` / `Corrigé (commit)` / `Rejeté (raison)` — Priorités : `Critique` / `Haute` / `Moyenne` / `Basse`.*

---

## 🚀 Phase 4 — Fonctionnalités restantes (prochaine vague)

### F07 - Import de Recettes depuis URL
- Extraction des métadonnées Schema.org (Recipe), parse des sites populaires (Marmiton, 750g…)
- Prévisualisation avant import, message clair si site non supporté, import manuel toujours possible
- Fichiers : `app/actions/import-recipe.ts`, `app/recipes/import/ImportRecipeForm.tsx`
- Estimation : 2-3 jours

### F10 - Notifications du Repas du Jour
- Notifications push (PWA) quotidiennes à heure configurable : « Aujourd'hui : [Nom du repas] »
- Email optionnel (si SMTP configuré)
- Fichiers : Service Worker, `app/api/notifications/route.ts`
- Estimation : 2 jours — *dépend partiellement de F12 (PWA)*

### F11 - Gestion du Garde-Manger
- Quantité disponible par ingrédient, date de péremption optionnelle
- Intégration liste de courses : exclusion des ingrédients en stock, suggestions d'achat
- Fichiers : table `pantry_items` (schéma), `app/pantry/page.tsx`, migration
- Estimation : 2-3 jours

### F12 - Mode Hors-Ligne Partiel (PWA)

**Partie 1 livrée — PWA installable** : `public/manifest.json` (thème teal, icônes 192/512 maskable), `public/sw.js` (coquille hors-ligne : assets cache-first, navigations réseau-avec-repli, `/api/` jamais interceptée), enregistrement dans le layout (`app/ServiceWorkerRegister.tsx`). Installation depuis Chrome Android (menu → « Installer l'application ») ou Safari iOS (« Sur l'écran d'accueil »).

- [x] Manifest PWA complet (icônes, thème) pour installation
- [x] Service Worker — coquille : l'app s'ouvre et affiche l'accueil hors-ligne
- [ ] Service Worker — données : cache des recettes/ingrédients, consultation du calendrier hors ligne
- [ ] Synchronisation automatique au retour en ligne
- Reste : ~1-2 jours

*Notes : HTTPS requis pour le SW (fourni par le tunnel Cloudflare) ; icônes générées en aplats (fond teal + disque) — remplaçables par un vrai logo.*

### OAuth (Google, GitHub) — en attente de variables d'environnement
- Providers, boutons de connexion alternatifs, comptes liés
- Estimation : 1 jour

*Contrat de la vague 3 à prévoir : table `pantry_items` au schéma (F11). F07, F10 et F12 sont majoritairement des fichiers nouveaux → parallélisables en 3 workers ; F11 en 4ᵉ position ou en parallèle avec son contrat.*

---

## 🎨 Finitions / Backlog (basse priorité)

- [ ] Export PDF de la liste de courses (F05, optionnel)
- [ ] Partage de la liste de courses par lien (F05, optionnel)
- [ ] Réglage de la taille des formulaires (barres de scroll non désirées dans certains modals)
- [ ] Uniformisation des tailles de composants, très petits écrans, accessibilité (contrastes, navigation clavier)
- [ ] Statistiques de fréquence des recettes (F08, optionnel)
- [x] ~~Headers de sécurité HTTP~~ faits (C-013) — reste en option : une CSP complète (nonce/hash à chaque build pour le script inline du thème)
- [x] ~~Retrait de `data/sqlite.db` du suivi git~~ fait (C-011) — reste au choix : purge de l'historique (`git filter-repo`, réécriture du dépôt) et révocation des jetons créés avant le retrait

---

## 🗂️ Organisation des branches et du déploiement

| Branche | Rôle |
|---------|------|
| `main` | Référence stable — tag `last-stable` sur la dernière version validée |
| `beta` | Branche de test : déployée sur le conteneur Proxmox (CT 103), mise à jour via `pct exec 103 -- bash /opt/meal_plan/update.sh` **ou depuis l'application** (Paramètres → Update) |
| `feature/*` | Une branche par fonctionnalité (vagues IA) — conservées sur GitHub pour revue |

Déploiement complet (Proxmox + tunnel Cloudflare + dépannage) : **[DEPLOYMENT.md](DEPLOYMENT.md)**

---

## 🔗 Ressources et Références

- [Cahier des charges](meal_plan_requirements.md)
- [DEPLOYMENT.md](DEPLOYMENT.md) — guide de déploiement pas à pas (option script automatique incluse)
- [archives/ROADMAPV2.md](archives/ROADMAPV2.md) — historique de planification des phases 1-3
- [Documentation Next.js](https://nextjs.org/docs) · [dnd-kit](https://dndkit.com/) · [Drizzle ORM](https://orm.drizzle.team/)

---

## 📜 Historique des versions

| Version | Période | Contenu |
|---------|---------|---------|
| V1 (archivée) | - | Roadmap originale |
| V2 (archivée) | 2026-10 | Planification des phases 1-3 du cahier des charges |
| V3 (archivée) | 2026-10-07 | État réel post-phases 1-3 : phases terminées, processus IA documenté, campagne de tests, section corrections, phase 4 restante |
| **V3.1 (ce document)** | 2026-10-08 | Maintenance intégrée (page `/deploy` + `update.sh` + `db:ensure`), corrections C-002 à C-005, liens Utilisateurs/Partage/Profil/Update regroupés dans Paramètres |
