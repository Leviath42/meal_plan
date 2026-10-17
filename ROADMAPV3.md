# Meal Plan — ROADMAP V3 — État et Suite du Projet

*Version : **3.9** (2026-10-10) — intégration de l'audit complet (sécurité, bugs, propreté, UI/UX, bonnes pratiques). Versions précédentes dans [archives/](archives/).*

> **Lecture rapide pour un agent IA** : ce document est la source de vérité sur l'état du projet. Les sections essentielles sont « État des fonctionnalités », « Processus de développement » et « Audit 2026-10-10 ». Le détail des bugs corrigés vit dans [CORRECTIONS.md](CORRECTIONS.md), le cahier des charges dans [REQUIREMENTS.md](REQUIREMENTS.md), le guide utilisateur dans [MANUEL.md](MANUEL.md), le déploiement dans [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🎯 Résumé

Application web **familiale** de planification des repas : calendrier partagé, livre de recettes local, génération automatique des listes de courses, partage du planning par jetons — sans abonnement. Accès fluide à domicile comme à l'extérieur (tunnel Cloudflare, PWA installable).

---

## 🎯 Rôles et Permissions

| Rôle | Accès |
|------|-------|
| **ADMIN** | Lecture + écriture + gestion (comptes, jetons de partage, paramètres globaux) |
| **MEMBER** | Lecture + écriture (recettes, planning, courses, ses préférences) |
| **GUEST** | Aucun — compte en attente de validation par un ADMIN |

---

## 📊 État des fonctionnalités (Phases 1-3 terminées, livrées sur `beta`)

| Fonctionnalité | État | Notes |
|---|---|---|
| F01 Planification — calendrier, DnD, modals, couverts, dates passées refusées | ✅ | Validée en usage réel |
| F01 options — palette draggable, `/settings`, générateur de menus (`/calendar/generator`, respecte F08/F09) | ✅ | Générateur : 34 tests runtime PASS |
| F02 Recettes & ingrédients — CRUD, étapes optionnelles, `created_by`, sélecteurs par recherche multi-mots | ✅ | Biblio. de référence : `npm run db:seed-ingredients` (568 ingrédients, 12 rayons, idempotent) |
| F03 Suggestions — 3 recettes hors fenêtre antidoublon | ✅ | 9 tests runtime PASS |
| F04 Partage — jetons hachés, page publique, ICS 90 j, API JSON Home Assistant | ✅ | Test partiel (jeton actif) |
| F05 Liste de courses — génération en modal (7/14/30 j ou dates précises), échelle par couverts, fusion, rayons, purge validée | ✅ | Validée en réel |
| F06 Auth — NextAuth v5 (JWT), Argon2, rôles ADMIN/MEMBER/GUEST, reset par question secrète | ✅ | Rôles revalidés en base à chaque action |
| F08 Historique — `lastServedAt`, repas passés non supprimables | ✅ | 6 tests runtime PASS |
| F09 Antidoublon — intervalle configurable par utilisateur (`/settings`, défaut 7 j) | ✅ | 10 tests runtime PASS |
| F12 (partie 1) PWA installable — manifest statique, icône neutre `?v=4`, SW v6 (coquille hors-ligne), barres/splash neutres | ✅ | Habillage neutre : épisode C-040→C-045 |
| F13 Statistiques — `/stats` : utilisation du catalogue, top recettes, répartition, volume mensuel | ✅ | Agrégation SQL, zéro migration |
| F14 Thèmes — 5 palettes clair+sombre (teal, indigo, rose, ambre, vert forêt), accent UI + étiquettes calendrier, WCAG AA, sans flash | ✅ | Migration 0005 |
| UI/UX — accessibilité (ConfirmDialog focus piégé/Échap, `:focus-visible`, sélecteurs clavier), sections repliables, recherche partout | ✅ | Audit UI/UX livré (d29bb64) |
| Maintenance intégrée — `/deploy` (ADMIN) : version, mise à jour, rollback ; `update.sh` + `db:ensure` | ✅ | En service sur le CT beta |

**Stack** : Next.js 16 (App Router) · Tailwind CSS v4 (sombre par remappage) · Drizzle ORM + migrations (`drizzle/`) · SQLite better-sqlite3 (`data/sqlite.db`) · NextAuth v5 (JWT, Argon2) · Zod v4 · @dnd-kit.

---

## 🧠 Processus de développement — vagues IA supervisées

1. **Contrat** : le partagé (schéma DB, migrations, nav, routes publiques) est figé et committé sur `beta` AVANT le lancement des workers.
2. **Workers** : un agent par fonctionnalité, git worktree + branche `feature/*`, mission bornée (fichiers autorisés/interdits, spec, critères d'acceptation).
3. **Portes de qualité** : `tsc` + `build` + **tests d'exécution réels** (toute action serveur qui écrit en base doit être testée en runtime — tsc/build ne détectent pas, par ex., les transactions async refusées par better-sqlite3).
4. **Fusion séquentielle** : `beta` ← une branche à la fois, conformité vérifiée avant chaque merge.
5. **Validation humaine** : tests sur le CT Proxmox, promotion `beta → main` + tag `last-stable` par le propriétaire.

Historique : **V1** (F05 + F04 + F01-options, 3 workers), **V2** (F08 + F09 + F03, couloir unique).

---

## 🔍 Audit du 2026-10-10 (sécurité, bugs, propreté, UI/UX, bonnes pratiques)

**Verdict** : code de bonne qualité — fondamentaux de sécurité solides (Argon2, rate-limiting, jetons hachés, guards revalidés en base, en-têtes HTTP, transactions SQLite synchrones correctes, accessibilité soignée, `update.sh` robuste). Vérifications : `tsc` ✅, `next build` ✅ (avec `AUTH_SECRET`).

### Constats à traiter (par priorité)

| # | Gravité | Constat | Localisation | Fix suggéré | Effort |
|---|---------|---------|--------------|-------------|--------|
| A1 | 🔴 | Suite de lint cassée : `next lint` invalide en Next 16, `eslint` absent des devDependencies, `eslint-config-next` en canary → **aucun lint ne tourne** | `package.json`, `eslint.config.mjs` | Ajouter `eslint` en devDep, version stable `eslint-config-next`, script `lint: eslint .` | 30 min |
| A2 | 🔴 | Aucun test automatisé ni CI (le processus exige des tests runtime ; ils ne sont que ponctuels) | repo | CI GitHub Actions (tsc + eslint + build) + tests runtime des actions critiques | 2-3 h |
| A3 | 🔴 | Rate-limit login par email uniquement → password spraying non borné (1 mdp courant sur N emails) | `lib/auth.ts:82` | Second bucket `login-ip:${ip}` (~30/15 min), IP via `x-forwarded-for` | 30 min |
| A4 | 🟠 | Routes à jeton (`/public/calendar`, `/api/calendar/*`) sans `Cache-Control: no-store` → risque de cache intermédiaire du planning | routes concernées | Ajouter l'en-tête | 15 min |
| A5 | 🟠 | `updateUserPassword` sans rate-limit sur le mot de passe actuel (brute-force possible avec session volée) | `app/actions/auth.ts` | Rate-limit léger (10/h) | 15 min |
| A6 | 🟠 | Reset par question secrète : la branche de succès confirme email + question + réponse ; indice exposé par `getUserSecurityQuestion` | `app/actions/auth.ts` | Exiger un second facteur, ou reset par l'ADMIN | à discuter |
| A7 | 🟡 | `console.log` d'échecs de connexion en prod (pollution des logs pm2 par les bots) | `lib/auth.ts:107-124` | Supprimer ou passer en `console.debug` | 5 min |
| A8 | 🟡 | ~13 `any`/`@ts-ignore` (`ingredients: any`, `getValue(state: any)`, 2 `@ts-ignore` NextAuth) | `app/actions/recipes.ts`, formulaires, `lib/auth.ts` | Typer via `z.infer`, augmentation de module | 1 h |
| A9 | 🟡 | Duplication : `formDataToRecord` ×3, libellés/ordre des types de repas ×2 (déjà dans `lib/meal-types.ts`), `todayLocalStr` ×3, `getValue`/`getFieldValue` ×2 | actions, routes API | Factoriser dans `lib/` | 1 h |
| A10 | 🟡 | `catch` génériques trompeurs : toute erreur SQL → « Cet ingrédient existe déjà » | `app/actions/ingredients.ts` | Distinguer l'unicité (`UNIQUE constraint failed`) des autres erreurs | 30 min |
| A11 | 🟡 | `getPublicAppSettings` invocable anonymement ('use server' exportée) — ne renvoie que le thème, bénin, mais contrat à clarifier | `app/actions/settings.ts` | Documenter/filtrer explicitement | 15 min |
| A12 | ℹ️ | Rate-limit en mémoire volatile : un `pm2 restart` (automatique via `update.sh`) remet les compteurs à zéro | `lib/rate-limit.ts` | Documenté comme limite connue ; Redis si multi-instance | — |

### Points forts confirmés par l'audit (à préserver)

- Guards serveur systématiques (`requireSession`/`requireAdmin`, rôle revalidé en base à chaque action).
- Jetons hachés SHA-256, valeur claire montrée une fois, révocation traçable.
- Anti-énumération d'emails (messages neutres), Argon2 + rate-limit avant calcul coûteux.
- En-têtes de sécurité (`next.config.ts`), CSP différée et documentée.
- Transactions better-sync `.run()/.get()` correctes, `foreign_keys=ON`, WAL, base non versionnée.
- Contrôles serveur des règles métier (dates passées, durées de jetons, dernier admin).
- Accessibilité (focus piégé, Échap, aria), Zod partout, `dangerouslySetInnerHTML` limité à 2 blocs statiques.

**Recommandation** : traiter A1→A5 en premier (faible risque, fort ROI) — idéalement en V3 (vague suivante), A6→A11 en V4.

---

## 🧪 Campagne de tests en cours (validation humaine)

### F04 — Partage
- [ ] Créer un jeton (`/share`, ADMIN) → lien public en navigation privée ; révoquer → « Lien invalide ou expiré »
- [ ] ICS (`/api/calendar/ics?token=…`) importé dans un agenda ; API JSON testée avec Home Assistant
- [ ] `/share` en MEMBER → redirection accueil

### F01 options + générateur
- [ ] Palette « Recettes » : drag vers créneau vide, en-tête de date, cellule jour+type ; dates passées refusées ; palette jamais destructive
- [ ] Info-bulles des badges, suffixe type de plat ; menu mobile (clic extérieur, Échap) ; `/settings` ADMIN ↔ MEMBER
- [ ] Générateur : mode combler / remplacer, antidoublon respecté pendant le run, cas d'échec (petit catalogue / intervalle élevé) comptés dans le résumé

### Phase 3 (F08 / F09 / F03)
- [ ] Replanification J+3 refusée / J+8 acceptée / contrôle désactivé (0) accepté (fenêtre exclusive : J+X exact accepté)
- [ ] Badge « déjà servi » + ligne « Dernier repas planifié » ; suggestions excluant la fenêtre ; intervalle antidoublon modifiable par un MEMBER

### Audit UI/UX
- [ ] Modals : Échap, overlay, `role=dialog`, Tab au clavier ; `ConfirmDialog` (suppression, révocation) ; pinch-zoom ; en-tête `/calendar` sans débordement ; contour focus visible

### Général
- [ ] Parcours complet mobile (tunnel Cloudflare), chaque page/formulaire, mode sombre
- [ ] Deux comptes simultanés (ADMIN + MEMBER) : permissions réelles de chaque rôle

---

## 🛠️ Corrections

Journal complet (C-001 → C-045, descriptions, solutions, commits) : **[CORRECTIONS.md](CORRECTIONS.md)**.

| Indicateur | Valeur |
|---|---|
| Corrections enregistrées | 45 (C-001 → C-045) |
| Corrigées et déployées | 44 |
| En traitement côté appareil | 1 (C-027 : entrée parasite du gestionnaire de mots de passe) |
| Critiques | 3 (C-007, C-011, C-030) |
| En suspens | C-011 : purge de l'historique git + révocation des jetons pré-retrait ; CSP complète (nonce/hash) |
| Connu et assumé | Sessions JWT non révocables (maxAge 7 j en compensation) |

---

## 🚀 Phase 4 — Fonctionnalités restantes (prochaine vague)

| Fonctionnalité | Contenu | Fichiers | Estimation |
|---|---|---|---|
| **F07 Import de recettes URL** | Extraction Schema.org (Recipe), parse Marmiton/750g…, prévisualisation, repli manuel | `app/actions/import-recipe.ts`, `app/recipes/import/ImportRecipeForm.tsx` | 2-3 j |
| **F10 Notifications** | Push PWA quotidien à heure configurable, email optionnel (SMTP) | SW, `app/api/notifications/route.ts` | 2 j (dépend de F12) |
| **F11 Garde-manger** | Stock par ingrédient + péremption, exclusion de la liste de courses | table `pantry_items`, `app/pantry/page.tsx`, migration | 2-3 j |
| **F12 Hors-ligne (reste)** | Partie 1 livrée (PWA installable, coquille). Reste : cache des données, sync au retour en ligne | `public/sw.js` | 1-2 j |
| **OAuth** | Google/GitHub — en attente des variables d'environnement | — | 1 j |

*Contrat de la vague : table `pantry_items` au schéma (F11). F07/F10/F12 = fichiers nouveaux → parallélisables en 3 workers ; F11 en 4ᵉ position.*

---

## 🎨 Finitions / Backlog (basse priorité)

- [ ] Export PDF de la liste de courses ; partage de la liste par lien (F05, optionnels)
- [ ] Taille des formulaires (scrolls indésirables dans certains modals) ; uniformisation très petits écrans
- [ ] Bump typo global (`text-xs` → `text-sm`) — reporté volontairement après validation mobile
- [x] ~~Accessibilité~~ (audit UI/UX, d29bb64) · ~~En-têtes HTTP~~ (C-013) · ~~Retrait de `data/sqlite.db` de git~~ (C-011) — restes en suspens : purge de l'historique + CSP complète (cf. Corrections)

---

## 🗂️ Branches et déploiement

| Branche | Rôle |
|---|---|
| `main` | Production — tag `last-stable` ; le CT de production la suit (`.deploy-branch`) |
| `beta` | Test — CT beta ; mise à jour via `pct exec <CT> -- bash /opt/meal_plan/update.sh` ou depuis l'app (Paramètres → Update) |
| `feature/*` | Une par fonctionnalité (vagues IA), conservées pour revue |

Installation d'un CT : `bash scripts/proxmox-install.sh <CTID> <email> [mdp]` — options `BRANCH=main` (prod) et `CF_TUNNEL_TOKEN=<jeton>` (HTTPS extérieur sans ouverture de port). Procédure complète de promotion et d'installation prod : **[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## 📜 Historique des versions

| Version | Contenu |
|---|---|
| V1-V3.2 (archivées) | Phases 1-3 du cahier des charges ; maintenance intégrée ; générateur de menus ; script multi-branche ; tunnel Cloudflare |
| V3.3-V3.5 (archivées) | Corrections C-031→C-038 ; retour campagne (largeurs, étapes optionnelles, historique, créateur, sélecteurs recherche) ; F13 stats + biblio. d'ingrédients |
| V3.6-V3.8 (archivées) | F14 thèmes/palettes (5 palettes WCAG AA) ; habillage PWA neutre C-040→C-045 |
| **V3.9 (ce document)** | **Audit 2026-10-10 : constats A1→A12 classés par gravité, points forts à préserver, plan d'action priorisé ; rationalisation de la roadmap (source de vérité unique, renvois vers les docs dédiées) ; compteur de corrections aligné (45)** |
