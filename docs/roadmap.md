# Meal Plan - ROADMAP V3 - État Réel et Suite du Projet

*Dernière mise à jour : 2026-11-07 (v3.18)*
*Version : 3.18 — Les versions précédentes sont archivées dans [archives/](archives/)*
*Basé sur : [cahier-des-charges.md](cahier-des-charges.md) (cahier des charges)*

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
| - | **Audit UI/UX complet** — accessibilité (modals `role=dialog`/Échap/focus piégé, `ConfirmDialog` remplaçant les 5 `window.confirm()` natifs, `:focus-visible` global, `userScalable:false` retiré, toast `role=alert`), factorisation (`lib/meal-types.ts`, helpers de dates dans `lib/format.ts`), `RecipePicker` (recherche de recettes par mots-clés, insensible aux accents, navigation clavier) remplaçant les selects déroulants des modals, en-tête calendrier responsive (« Aujourd'hui » ne sort plus du cadre) | ✅ Livré (d29bb64, ae4e50f) | Fusionné sur `main` (4cbd520) — à valider dans la campagne de tests |
| - | **Infrastructure CT beta stabilisée** — IP statique, DNS double resolver, `pm2 startup systemd` (reboot-proof) ; `update.sh` immunisé aux pannes réseau (C-035/C-036) | ✅ En service | Voir [correctifs.md](correctifs.md) C-035/C-036 |
| - | **Lot « retour campagne de tests » (C-037)** — largeurs uniformes ; étapes de préparation optionnelles ; repas passés non supprimables (historique fiable) ; créateur de recette (`created_by`, migration 0004) ; sélecteurs recherche partout (RecipePicker, SearchSelect, catalogue à l'ajout courses) ; génération de courses en modal fermant en cas de succès ; purge validée (achetés par défaut) ; masquage des achetés par défaut | ✅ Livré (1e1f34d → 05e497d) | Fusionné sur `main` |
| - | **Icône PWA chronomètre & couverts** (design du propriétaire) + règle anti-cache des icônes (`?v=N`, SW v5) | ✅ Livré (22af57, 6aec3a9) | C-038 |
| - | **F13 - Statistiques d'usage** — page `/stats` (lecture seule, lien « Stats » dans la nav) : utilisation du catalogue (barre de progression, jamais planifiées, notes libres), top 10 des recettes les plus cuisinées, répartition par type de plat, volume mensuel (12 mois) — agrégation SQL pure, zéro migration | ✅ Livré (e9f281c) | Fusionné sur `main` |
| - | **Bibliothèque d'ingrédients de référence** — `npm run db:seed-ingredients` : 568 ingrédients en 12 rayons, `INSERT OR IGNORE` idempotent et non destructif, applicable sur une base en service (beta et prod) sans toucher aux données existantes | ✅ Livré (e9f281c) | Testé : +490 sur base démo, 2ᵉ passage 100 % ignoré |
| - | **F14 - Thèmes et palettes de couleurs** — 5 palettes (teal, indigo, rose, ambre, vert forêt) sélectionnables dans `/settings` (ADMIN), chacune déclinée clair + sombre ; contrastes vérifiés WCAG AA (4.9:1 à 8.8:1) ; teinte l'accent UI ET les étiquettes du calendrier par type de repas (avec aperçu dans le sélecteur, couleurs distinctes colorblind-safe) ; injection SSR sans flash (variables CSS `--color-accent*`, revalidation layout) ; page publique de partage suit le thème ; migration 0005 (`app_settings.theme`) | ✅ Livré | Conception recherche Okabe-Ito/WCAG 2026-10 |
| - | **PWA — habillage neutre (C-040 → C-045)** — badges basculant proprement en mode sombre (remappage étendu aux familles amber/sky/rose) ; **icône neutre** (chronomètre & couverts sur fond noir, design du propriétaire) intégrée avec la règle anti-cache (`?v=4`, SW v6) ; barres d'application et splash **noir profond** (`#0c0c0e`) avec barre haute suivant le mode SYSTÈME (metas media-query) — connaissance plateforme documentée : Android fige les couleurs du manifest à l'installation, la palette ne peut pas y être suivie, seul le mode système est dynamique ; manifest 100 % statique via route dédiée (`/api/manifest-json` + rewrite) ; viewport-fit cover + safe-area | ✅ Livré | Épisode complet dans correctifs.md C-040→C-045 |
| 2 | **F05 - Liste de courses** | ✅ Complet | Génération validée en réel (échelle des couverts, rayons, fusion) |
| 2 | **F04 - Partage** | ✅ Complet | Jetons, page publique, ICS, API JSON HA — test partiel effectué (jeton actif) |
| 3 | **F08 - Historique** | ✅ Complet | `lastServedAt`, indicateur dans le calendrier — 6 tests runtime PASS |
| 3 | **F09 - Antidoublon** | ✅ Complet | Fenêtre configurable par utilisateur — 10 tests runtime PASS |
| 3 | **F03 - Suggestions** | ✅ Complet | 3 propositions excluant la fenêtre antidoublon — 9 tests runtime PASS |
| - | Auth, recettes, ingrédients, profil, admin | ✅ Complet | Audits de sécurité passés |
| - | **Confort des catalogues** — sections repliées par défaut ; liste de courses : bouton « Dates précises » (plage libre du/au, min = aujourd'hui) en plus du preset 7 jours, segments du haut compactés en une carte, ajout d'article via bouton « + Nouvel article » (formulaire révélé au clic) ; page ingrédients : bouton « + Nouvel ingrédient » aligné à droite du titre (cohérent avec « + Nouvelle recette », formulaire repliable) ; sélecteur « Rayon » avec liste des rayons existants + création à la volée (page ingrédients, création rapide des formulaires recette) via `CategorySelect` partagé ; liste de courses : sections dépliées par défaut, bouton « Tout plier / Tout déplier », masquage des articles achetés | ✅ Livré | Validateur période testé en runtime (9 PASS) |
| - | **Navigation des catalogues** — sections repliables par catégorie (recettes par type de plat, ingrédients par rayon, liste de courses par rayon) + recherche texte sur recettes (titre/description/tags/type) et ingrédients (nom/rayon), via `CollapsibleSection` partagé | ✅ Livré | À valider sur téléphone |
| 1 | **F01 — Générateur de menus** — page `/calendar/generator` accessible depuis le bouton « Générer un menu… » de /calendar : plage de 1 à 30 jours (min = aujourd'hui), jours de semaine, types de repas et types de plats autorisés par repas, couverts, tags exclus, mode combler (créneaux vides) / remplacer (supprime les repas existants, notes libres incluses) ; respecte l'antidoublon F09 (fenêtre exclusive) et met à jour l'historique F08 — server action testée en runtime (34 PASS) | ✅ Livré | À valider sur le CT beta |
| - | **Maintenance intégrée** — page `/deploy` (version chargée, mise à jour, rollback) + `update.sh` + `db:ensure` | ✅ En service | Déployé et testé sur le CT beta |
| 4 | **F12 (partie 1)** — PWA installable : manifest, icônes maskable, Service Worker (coquille hors-ligne) | ✅ Livré | À valider sur Android : installation + ouverture hors-ligne |
| 0 | **Onboarding self-service** (vague 3, C-051, PR #26, 02/11/2026) — `/register` redevenu public : `registerUser` crée un MEMBER directement (plus de file d'attente ADMIN, GUEST historique toujours refusé au login), bannière « compte créé » sur /login, page `/welcome` (3 écrans de démarrage) | ✅ Mergé sur `beta` | `test:onboarding` 3 PASS, en CI |
| - | **CT de démonstration publique** (PR #17, `main`, 02/11/2026) — `scripts/seed-demo-planning.ts` : seed de planning de démo idempotent + runbook [deploiement-demo.md](deploiement-demo.md) pour un CT dédié ( vitrine pour la commercialisation) | ✅ Mergé sur `main` | Voir runbook |

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

### Audit UI/UX (nouveau — version auditée)
- [ ] Modals de planification : fermeture par Échap, clic sur l'overlay, `role=dialog` annoncé ; focus dans le modal au clavier (Tab)
- [x] ~~`RecipePicker`~~ validé en campagne (recherche multi-mots, accents, clavier) — étendu depuis : rayon (SearchSelect), ingrédient des recettes, catalogue à l'ajout courses
- [ ] `ConfirmDialog` : suppression d'une recette/ingrédient, révocation d'un jeton — message en français, focus sur Annuler, Échap annule
- [ ] Zoom mobile réactivé (pinch-zoom fonctionne sur la page login)
- [ ] En-tête `/calendar` : « Aujourd'hui » et « Recettes » visibles sans débordement, même sur petit écran
- [ ] Navigation clavier : contour visible (accent) sur boutons/liens à la tabulation

### Générateur de menus
- [ ] Bouton « Générer un menu… » dans l'en-tête du mois de /calendar → page /calendar/generator
- [ ] Mode « combler » : seuls les créneaux vides sont remplis ; mode « remplacer » : repas existants (y compris notes libres) supprimés avant génération
- [ ] Fenêtre antidoublon respectée (X=7 : aucune recette replanifiée à moins de 7 jours, pendant le run et par rapport à l'existant)
- [ ] Cas d'échec : petit catalogue / intervalle élevé → créneaux « sans recette compatible » comptés dans le résumé

### Phase 3 (F08 / F09 / F03)
- [ ] Planifier une recette, tenter de la replanir à J+3 → refus ; à J+8 → accepté ; contrôle désactivé (0) → accepté *(fenêtre exclusive depuis C-023 : à X=7, J+7 exactement est aussi accepté)*
- [ ] Badge « • » déjà servi + info-bulle ; ligne « Dernier repas planifié » sur la page recette
- [ ] Bouton « Suggérer » du modal de création : les propositions excluent la fenêtre antidoublon ; cas d'échec (petit catalogue / intervalle élevé)
- [ ] `/settings` → « Mes préférences » : intervalle antidoublon enregistrable par un MEMBER

### Général
- [ ] Parcours complet sur téléphone (via tunnel Cloudflare) : chaque page, chaque formulaire, mode sombre
- [ ] Deux comptes simultanés (ADMIN + MEMBER) : permissions réelles de chaque rôle

---

## 🛠️ Corrections

> Le journal complet des corrections (C-001 → C-030, avec descriptions, solutions et commits de référence) vit dans **[correctifs.md](correctifs.md)**.

| Indicateur | Valeur |
|---|---|
| Corrections enregistrées | 61 (C-001 → C-061 — synthèse détaillée dans [correctifs.md](correctifs.md)) |
| Corrigées et déployées | 33 en production ; vague 3 (C-046 → C-052) + correctifs F07 (C-053 → C-056) mergés sur `beta`, promotion `main` à valider |
| En traitement côté appareil | 1 (C-027 : supprimer l'entrée parasite du gestionnaire de mots de passe) |
| Critiques | 3 — toutes trouvées par l'audit du 2026-10-08 (C-007, C-011, C-030) |
| Décisions en suspens | C-011 : branches/tags réécrits et jetons révoqués le 24/10/2026 ; reste le réalignement des clones/CT (purge Support GitHub écartée par décision, risque résiduel accepté) |

---

## 🛡️ Conformité socle commercial — audit du 24 oct. 2026

Audit du repo contre une checklist « socle d'une application commerciale B2B/B2C » (hygiène GitHub, sécurité native, CI/CD, OWASP, sauvegardes, exploitation, légal). Traçabilité détaillée : [cahier-des-charges.md](cahier-des-charges.md) §6.

- [x] **SECURITY.md créé** (`.github/SECURITY.md`) + **Dependabot version updates configuré** (`.github/dependabot.yml`) — 24 oct. 2026
- [x] **Côté propriétaire — fait le 24 oct. 2026 (meal_plan et modop)** : secret scanning + push protection ✅ ; code scanning CodeQL ✅ ; Dependabot alerts vérifiées ✅ ; signalement privé ✅ ; 2FA ✅
- [ ] **C-011 (priorité n°1)** : branches/tags réécrits et jetons révoqués le 24/10/2026 ; reste le réalignement des clones/CT beta-prod — purge Support GitHub écartée par décision du 24/10/2026 (jetons révoqués, risque résiduel accepté) — [runbook](purge-historique-c-011.md)
- [x] CI GitHub Actions à chaque push/PR sur `main` et `beta` : lint + typecheck + build + **tests runtime** (`npm test`, base jetable) + `npm audit` prod high+ — `.github/workflows/ci.yml` (PR #10/#11, 25 oct. 2026 ; C-047 : job tests + branche beta, 02/11/2026)
- [x] CSP complète : nonce par requête dans `proxy.ts` + script inline du thème noncé via `headers()` (C-048, 02/11/2026, testé en runtime : header CSP et nonce HTML concordants) — `Report-Only` hors production
- [x] Sessions révoquées au changement de mot de passe : `users.token_version` incrémenté (change/reset password), vérifié en base à chaque requête (callback JWT + `proxy.ts`) — C-049, 02/11/2026, testé en runtime (login 200 → bump → 307). La purge C-011 avait aussi supprimé `drizzle/meta/0005_snapshot.json` : snapshot reconstruit, migration 0006 propre
- [x] Sauvegarde nightly planifiée + copie hors CT : vzdump CT 103/104 + hook rclone crypt → R2 (rétention offsite 2 j) ; restauration prouvée le 28/10 (RTO 10 min, runbook R2) ; `.env.local` migré au coffre Vaultwarden (H48, 1ᵉʳ nov.) — voir [plan-de-reprise.md](plan-de-reprise.md)
- [x] Endpoint `/api/health` hors middleware auth (C-046, 02/11/2026, testé en runtime 200/503) ; reste : poser le moniteur Uptime Kuma dédié (CT 111) pointant dessus
- [ ] Releases SemVer (tags + notes de version) au premier lot de production
- [ ] Au lancement commercial : licence actée (reco FSL-1.1), CGV/mentions légales publiées, accessibilité EAA (déclaration + bases WCAG)
- [ ] **Suivi des versions des CGV (art. 19) + liaison licence ↔ version** : chaque révision des CGV versionnée et datée (v1.0, v1.1…) et archivée ; à chaque vente, enregistrer **la version des CGV acceptée + la date de licence** — prouver sans ambiguïté quelle version s'applique à quel client (art. 19 des CGV v1.0 prévoit la modification ; un litige se juge sur la version applicable). Ajouté le 26 oct. 2026. Implémentation naturelle : au webhook `checkout.session.completed`, stocker la version des CGV en **métadonnées du paiement** (`cgv_version` + `license_date`) → le lien licence ↔ version s'écrit tout seul dans SQLite, sans ressaisie.
- [ ] **Suspension / réactivation d'une licence** : action admin (raison tracée, date) — cas d'usage : remboursement, litige, médiation, fraude, test support ; le foyer suspendu garde ses données (lecture seule ou accès bloqué, à décider en spéc) mais perd l'accès premium ; toute suspension/réactivation consignée dans le journal (auditabilité, cohérente avec l'accès admin support tracé du CDC). Ajouté le 26 oct. 2026.

---

## 🚀 Phase 4 — Vague 4 lancée le 06/11/2026

**Organisation** ([contrat-vague-4.md](contrat-vague-4.md), figé avant workers ; [test-plan-vague-4.md](test-plan-vague-4.md) pour les gates et le débogage) :
- **Vague 4a (parallèle)** : W1 = F10+F12 (SW/push), W2 = F11 (garde-manger), W3 = F15 (feedback), W4 = F16 (standards), W5 = F18 (export/import JSON) — migration `0008` + nav figées dans le contrat. **🟢 Toute la 4a est mergée sur `beta` le 06/11/2026** (C-057 → C-061 ; tests runtime en CI : pantry 29, feedback 24, standards 19, export 34, notifications 27 PASS) — reste la validation humaine CT beta (scénarios du [test-plan-vague-4.md](test-plan-vague-4.md) §2) puis la vague 4b ;
- **Vague 4b (séquentielle)** : W6 = **F17 multi-tenant** (chantier prioritaire confirmé le 06/11/2026 — cascade `household_id` sur toutes les tables, backfill foyer unique, isolation en requête ; seul, après les fusions 4a). **🟡 Lancée le 06/11/2026** — contrat figé ([contrat-vague-4b.md](contrat-vague-4b.md) : rattachement table par table, backfill runtime idempotent, isolation via `lib/household.ts`, gardes `MULTI_HOUSEHOLDS`), worker W6 sur `feature/multi-tenant-household` ;
- **OAuth** : bloqué sur les variables d'environnement propriétaire — hors vague.

### F07 - Import de Recettes depuis URL — 🟢 mergé sur `beta` (PR #25, 05/11/2026)
- ✅ Extraction Schema.org (JSON-LD Recipe), fallback og: Marmiton/750g, prévisualisation avant import, doublon de titre suffixé, ingrédients inconnus créés au catalogue
- ✅ Fichiers : `lib/recipe-import.ts`, `app/actions/import-recipe.ts`, `app/recipes/import/` ; test runtime en CI (`test:import`)
- ✅ **Durci après la première validation humaine (06/11/2026)** : C-053 mode sombre respecté (le remappage `:root.dark` suffit) ; C-054 crash « This page couldn't load » après confirmation (`router.push` au rendu → `useEffect`) ; C-055 `ilike()` inexistant en SQLite → `LOWER(col) = LOWER(?)` dans helpers partagés action + test (le test répliquait la requête avec `eq`, d'où 16 PASS CI alors que le code plantait) ; C-056 parseur d'ingrédients refait — lignes fragmentées nom/quantité recollées, qualificatifs isolés rattachés, unités multi-mots normalisées (cuillère à soupe, g…), fractions, fallback og:+microdata pour TOUS les sites (fini Marmiton/750g only), UA navigateur (fini les 403). `test:import` 16→32 PASS (les scripts de test tournent désormais aussi sous Windows)
- Reste : validation humaine sur CT beta + vraies pages (en cours — le point d'entrée durci est poussé, un site précis en échec = envoi de l'URL pour ajustement)

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

- [x] **Livré (vague 4a, worker W2 — C-057, branche `feature/f11-garde-manger`)** : page `/pantry` (CRUD stock une ligne par ingrédient, quantités décimales, unité pré-remplie du catalogue — SearchSelect partagé, péremption optionnelle avec badge rouge « Périmé » + alerte en page), génération de courses déduisant le stock par (ingrédient, unité) — 500 g demandés dont 200 g en réserve → 300 g, besoin couvert → article exclu, compteurs rendus dans le message de génération + infolettre dans le modal ; cœur de génération extrait dans `app/shopping-list/queries.ts` (module partagé avec le test runtime, C-055) ; helpers de production dans `app/pantry/queries.ts` ; test runtime `scripts/test-pantry.ts` — 29 PASS (P1→P5) ; reste : validation humaine CT beta (UI sombre/mobile, parcours GUEST en session réelle)

### F12 - Mode Hors-Ligne Partiel (PWA)

**Partie 1 livrée — PWA installable** : `public/manifest.json` (thème teal, icônes 192/512 maskable), `public/sw.js` (coquille hors-ligne : assets cache-first, navigations réseau-avec-repli, `/api/` jamais interceptée), enregistrement dans le layout (`app/ServiceWorkerRegister.tsx`). Installation depuis Chrome Android (menu → « Installer l'application ») ou Safari iOS (« Sur l'écran d'accueil »).

- [x] Manifest PWA complet (icônes, thème) pour installation
- [x] Service Worker — coquille : l'app s'ouvre et affiche l'accueil hors-ligne
- [ ] Service Worker — données : cache des recettes/ingrédients, consultation du calendrier hors ligne
- [ ] Synchronisation automatique au retour en ligne
- Reste : ~1-2 jours

*Notes : HTTPS requis pour le SW (fourni par le tunnel Cloudflare) ; icônes générées en aplats (fond teal + disque) — remplaçables par un vrai logo.*


### Licence par foyer + Stripe — 🟢 mergé sur `beta` (PR #27, 05/11/2026) — reste : branchement Stripe réel en prod (payment link, secret webhook)
- ✅ Schéma `licenses` + `license_audit` (migration 0007, contrat #24) ; essai 30 j puis lecture seule (garde `proxy.ts`)
- ✅ Webhook Stripe : signature HMAC vérifiée (5 min anti-rejeu), idempotent, métadonnées `cgv_version`/`license_date` ; `charge.refunded` → suspension
- ✅ `/activate` (clé MP-XXXX hashée) + `/admin/licenses` (suspension/réactivation tracée) ; lien d'achat via `STRIPE_PAYMENT_LINK`
- ✅ Tests runtime 15 PASS (`test:license`, webhook signé/invalide/rejoué)
- Reste : vraies clés Stripe (test d'abord) en `.env.local`, validation humaine CT beta, S05–S10

### F17 - Multi-tenant par foyer (household_id) — 🟡 prioritaire, vague 4b (séquentielle)
- **Décision du 06/11/2026** : le chantier reste prioritaire (option A du CDC §5) malgré le modèle auto-hébergé « un CT/foyer » — l'isolation `household_id` sécurise l'ouverture future à l'hébergement mutualisé et fiabilise les données multi-foyers sur une même instance
- Table `households` + `users.household_id` déjà posées en 0008 (contrat vague 4) ; le RESTE de la cascade relève de W6 : `household_id` sur TOUTES les tables métier, backfill (toutes les données préexistantes → un foyer unique), isolation stricte requête par requête (aucune fuite inter-foyers : recettes, planning, courses, stock, feedback, jetons), rollback documenté
- Contrat dédié à écrire avant le lancement de W6 (après les fusions 4a)
- Estimation : 3-4 jours — **jamais en parallèle d'autres workers**

### F18 - Export/import JSON complet — 🟡 prioritaire, worker W5 (vague 4a)
- Export d'un JSON daté+versionné de tout le contenu familial (recettes, liaisons, ingrédients, planning, garde-manger, paramètres) — **jamais** mots de passe/jetons/clés ; cohérent avec le contrat v3 : export autorisé même en essai expiré
- Import transactionnel atomique (tout ou rien), doublons de titre suffixés
- Enjeu commercial : portabilité des données (départ sans vendor lock-in), conformité au positionnement auto-hébergé
- Fichiers : `lib/export.ts`, `lib/import.ts`, action + section ADMIN `/settings`

### OAuth (Google, GitHub) — en attente de variables d'environnement
- Providers, boutons de connexion alternatifs, comptes liés
- Estimation : 1 jour

### F15 - Système de retours clients (feedback)

**Objectif commercial** : installer la boucle de feedback dès la bêta privée — savoir pourquoi un essai ne convertit pas, capter les bugs terrain et les idées avant le lancement public. Le feedback fait partie des critères Go/No-Go (plan-action-10k-foyers.md) : sans canal de retour, pas d'apprentissage bêta.

**Périmètre v1 — moyens du bord, zéro service tiers** (pas de SaaS de feedback, cohérent avec le positionnement vie privée / auto-hébergé) :

- Table *feedback* (**migration 0008, figée par le contrat vague 4**) : id, user_id, catégorie (bug / idée / question / ressenti prix), message, page/URL d'origine, version de l'app, created_at, statut (nouveau / trié / traité / rejeté) — la colonne `household_id` suivra la cascade F17 (4b)
- Bouton « Retours » permanent (nav ou footer) → modal /feedback : 3 clics maximum (catégorie, message, envoyer), server action + validation Zod, rate-limit simple par utilisateur
- Page ADMIN /admin/feedback : liste triable, changement de statut, compteur par catégorie — base du tri hebdomadaire
- Enquêtes par email (si SMTP configuré, sinon relance manuelle) :
  - J-7 de fin d'essai : « Qu'est-ce qui vous a manqué ? » + la question prix actée (« cher / correct / cadeau ? »)
  - J+30 après achat : NPS 0-10 + commentaire libre
- Enquête satisfiable en 30 secondes ; aucun champ obligatoire hormis le message
- Vie privée : aucune donnée personnelle au-delà du compte existant ; mention dans la politique de confidentialité (finalité « amélioration du produit »)
- Option (plus tard) : suggestion de créer une issue publique sur le repo pour les idées de fonctionnalités

**Fichiers** : app/feedback/ (modal + action), app/admin/feedback/page.tsx, table `feedback` (contrat vague 4, migration 0008), éventuellement lib/email (réutilisation F10)

**Estimation : 1-2 jours** — worker W3 de la vague 4a (fichiers majoritairement nouveaux)

---

### F16 - Règles de quantité standard par ingrédient
- Quantité « standard » par ingrédient (ou par famille d'ingrédient), fonction du nombre de couverts — ex. 100 g de pâtes / personne, 1 oignon pour 4 couverts
- À la création/édition d'une recette : suggestion automatique de la quantité en fonction du nombre de couverts saisi, ajustable manuellement
- Bénéfice : accélère la saisie des recettes et fiabilise les quantités (moins d'erreurs, listes de courses plus justes)
- Piste d'implémentation : table `ingredient_standards` (ingrédient ou famille, quantité_ref, nb_couverts_ref) + pré-remplissage du champ quantité dans le formulaire de recette ; démarrer sur une trentaine d'ingrédients courants plutôt qu'une base exhaustive
- Estimation : 1-2 jours — ajouté le 30 oct. 2026 sur demande de Nicolas

### F19 - Accompagnements liés aux plats
- Chaque recette peut référencer des **accompagnements proposés** et/ou un **accompagnement par défaut** (ex. risotto → légumes rôtis, riz, polenta)
- Au moment de planifier un repas sur le calendrier : sélection de l'accompagnement directement dans le modal (propositions de la recette + recherche libre dans le catalogue via `RecipePicker`), champ optionnel — rien d'imposé
- Génération de la liste de courses : les ingrédients de l'accompagnement choisi sont ajoutés à ceux du plat (échelle des couverts commune)
- Piste d'implémentation : accompagnement = recette du catalogue (flag ou type de plat « accompagnement ») + table de liaison `recipe_sides` (recipe_id, side_recipe_id, is_default) ; le choix planifié est stocké côté repas (`side_recipe_id` nullable, migration) — pas de duplication de recettes
- Générateur de menus : v1 = accompagnement par défaut automatique ; l'aléatoire parmi les propositions peut venir ensuite
- Bénéfice : repas complet planifié en une action, accompagnement moins souvent oublié, listes de courses plus justes
- Estimation : 1-2 jours — ajouté le 07 nov. 2026 sur demande de Nicolas

### F20 - Création de recette à la volée depuis le modal de planification
- Dans le modal de planification (et partout où `RecipePicker` sert à chercher une recette) : si la recherche ne renvoie aucun résultat, proposer un bouton « Créer \"<texte recherché>\" »
- Création rapide : titre pré-rempli avec le texte recherché, type de plat pré-coché selon le contexte du créneau, le reste (ingrédients, étapes) complété ensuite depuis la page recette — pas de formulaire complet dans le modal
- Après création : la nouvelle recette est directement sélectionnée dans le créneau en cours, pas de re-recherche
- Piste d'implémentation : extension de `RecipePicker` (état « aucun résultat » + callback onQuickCreate) + server action de création minimale (titre + type de plat, Zod, permission MEMBER) ; redirection vers la page recette pour compléter
- Bénéfice : supprime l'aller-retour calendrier → catalogue → calendrier quand la recette n'existe pas encore ; moins de friction pour l'utilisateur occasionnel
- Estimation : 0,5-1 jour — demandé par Nicolas le 07/11/2026 (F20)

---

## 🎨 Finitions / Backlog (basse priorité)

- [ ] Export PDF de la liste de courses (F05, optionnel)
- [ ] Partage de la liste de courses par lien (F05, optionnel)
- [ ] Réglage de la taille des formulaires (barres de scroll non désirées dans certains modals)
- [ ] Uniformisation des tailles de composants, très petits écrans
- [x] ~~Accessibilité (contrastes, navigation clavier)~~ largement couvert par l'audit UI/UX (d29bb64) — reste en revue : la bump typo global (`text-xs` → `text-sm` en base), reporté volontairement
- [x] ~~Headers de sécurité HTTP~~ faits (C-013) ; CSP complète faite (C-048, nonce par requête)
- [x] ~~Retrait de `data/sqlite.db` du suivi git~~ fait (C-011) — branches/tags réécrits et jetons révoqués le 24/10/2026 ; reste le réalignement des clones/CT beta-prod (purge Support GitHub écartée par décision ; runbook : [purge-historique-c-011.md](purge-historique-c-011.md))

---

## 🗂️ Organisation des branches et du déploiement

| Branche | Rôle |
|---------|------|
| `main` | Production — tag `last-stable` sur la dernière version validée ; le CT de production suit `main` (fichier `.deploy-branch`, lu par `update.sh` et la page /deploy) |
| `beta` | Branche de test : déployée sur le CT de test, mise à jour via `pct exec <CT> -- bash /opt/meal_plan/update.sh` **ou depuis l'application** (Paramètres → Update) |
| `feature/*` | Une branche par fonctionnalité (vagues IA) — conservées sur GitHub pour revue |

Installation d'un conteneur (test ou production) : `bash scripts/proxmox-install.sh <CTID> <email> [mdp]` — ajouter `BRANCH=main` pour un conteneur de production (défaut : `beta`) et `CF_TUNNEL_TOKEN=<jeton>` pour installer le tunnel Cloudflare (cloudflared en service système, HTTPS extérieur sans ouverture de port). La branche est mémorisée dans `/opt/meal_plan/.deploy-branch`. Procédure complète de promotion et d'installation prod : **[deploiement-proxmox.md](deploiement-proxmox.md)** (section Production).

Déploiement complet (Proxmox + tunnel Cloudflare + dépannage) : **[deploiement-proxmox.md](deploiement-proxmox.md)**

---

## 🔗 Ressources et Références

- [Cahier des charges](cahier-des-charges.md)
- [deploiement-proxmox.md](deploiement-proxmox.md) — guide de déploiement pas à pas (option script automatique incluse)
- [correctifs.md](correctifs.md) — journal complet des corrections (C-001 → C-030)
- [purge-historique-c-011.md](purge-historique-c-011.md) — runbook de purge de l'historique git (C-011)
- [archives/roadmap-v2.old.md](archives/roadmap-v2.old.md) — historique de planification des phases 1-3
- [Documentation Next.js](https://nextjs.org/docs) · [dnd-kit](https://dndkit.com/) · [Drizzle ORM](https://orm.drizzle.team/)

---

## 📜 Historique des versions

| Version | Période | Contenu |
|---------|---------|---------|
| V1 (archivée) | - | Roadmap originale |
| V2 (archivée) | 2026-10 | Planification des phases 1-3 du cahier des charges |
| V3 (archivée) | 2026-10-07 | État réel post-phases 1-3 : phases terminées, processus IA documenté, campagne de tests, section corrections, phase 4 restante |
| V3.1 (archivée) | 2026-10-08 | Maintenance intégrée (page `/deploy` + `update.sh` + `db:ensure`), corrections C-002 à C-005, liens Utilisateurs/Partage/Profil/Update regroupés dans Paramètres |
| V3.2 (archivée) | 2026-10-08 | Générateur de menus paramétrable (page /calendar/generator), liste de courses dépliée par défaut avec tout plier/déplier et masquage des achetés, bouton nouvel ingrédient aligné avec le titre |
| V3.3 (archivée) | 2026-10-08 | Préparation de la production : correction C-032 (script d'installation), script multi-branche (`BRANCH=main`), `update.sh` suit `.deploy-branch`, section Production dans deploiement-proxmox.md, correction C-031 (UX calendrier) ; tunnel Cloudflare optionnel à l'installation (`CF_TUNNEL_TOKEN`, cloudflared en service système) + section dédiée dans deploiement-proxmox.md |
| V3.9 (archivée) | 2026-10-24 | Audit « socle commercial » : section Conformité + checklist, `.github/SECURITY.md` + `.github/dependabot.yml` créés, CDC v1.5 (§6 suivi d'audit), PRA v1.0 ([plan-de-reprise.md](plan-de-reprise.md)) |
| V3.10 (archivée) | 2026-10-24 | C-011 : branches/tags réécrits et jetons révoqués ; reste le réalignement des clones/CT ; purge Support GitHub écartée par décision (risque résiduel accepté) |
| V3.11 (archivée) | 2026-10-24 | F15 Système de retours clients (feedback) ajouté à la Phase 4 ; création des documents legal-commercialisation.md et etat-des-lieux-commercialisation.md (dossier lancement) |
| V3.12 (archivée) | 2026-10-26 | Conformité : ajout du suivi des versions des CGV (art. 19) + liaison licence ↔ version CGV acceptée à chaque vente |
| **V3.13 (archivée)** | 2026-10-26 | Précision d'implémentation CGV (métadonnées `cgv_version`/`license_date` au webhook) + suspension/réactivation de licence (action admin tracée) |
| **V3.14 (archivée)** | 2026-10-30 | Ajout **F16 — règles de quantité standard par ingrédient** en Phase 4 (suggestion de quantité selon le nombre de couverts, pour faciliter la création de recettes) |
| **V3.15 (archivée)** | 2026-11-06 | Point post-vague 3 : corrections 46→56, onboarding self-service (C-051, PR #26) et CT démo publique (PR #17, `main`) enregistrés au tableau des livrés, F07 durci après validation humaine (C-053 → C-056, `test:import` 32 PASS) |
| **V3.16 (archivée)** | 2026-11-06 | **Lancement vague 4** : F17 multi-tenant et F18 export/import confirmés prioritaires en Phase 4 ; contrat figé ([contrat-vague-4.md](contrat-vague-4.md) — migration 0008, nav, workers W1-W5, fusion séquentielle, 4b multi-tenant seul) ; gates qualité étendues + plan de test/débogage ([test-plan-vague-4.md](test-plan-vague-4.md)) |
| **V3.17 (archivée)** | 2026-11-07 | Ajout **F19 — accompagnements liés aux plats** en Phase 4 : accompagnements proposés et/ou par défaut par recette, sélection directe au moment de planifier, ingrédients consolidés dans la liste de courses |
| **V3.18 (ce document)** | 2026-11-07 | Ajout **F20 — création de recette à la volée** en Phase 4 : bouton de création dans `RecipePicker` quand la recherche ne trouve rien, titre pré-rempli, nouvelle recette sélectionnée directement dans le créneau |
