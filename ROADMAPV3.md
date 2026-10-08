# Meal Plan - ROADMAP V3 - État Réel et Suite du Projet

*Dernière mise à jour : 2026-10-08*
*Version : 3.3 — Les versions précédentes sont archivées dans [archives/](archives/)*
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
| - | **Confort des catalogues** — sections repliées par défaut ; liste de courses : bouton « Dates précises » (plage libre du/au, min = aujourd'hui) en plus du preset 7 jours, segments du haut compactés en une carte, ajout d'article via bouton « + Nouvel article » (formulaire révélé au clic) ; page ingrédients : bouton « + Nouvel ingrédient » aligné à droite du titre (cohérent avec « + Nouvelle recette », formulaire repliable) ; sélecteur « Rayon » avec liste des rayons existants + création à la volée (page ingrédients, création rapide des formulaires recette) via `CategorySelect` partagé ; liste de courses : sections dépliées par défaut, bouton « Tout plier / Tout déplier », masquage des articles achetés | ✅ Livré | Validateur période testé en runtime (9 PASS) |
| - | **Navigation des catalogues** — sections repliables par catégorie (recettes par type de plat, ingrédients par rayon, liste de courses par rayon) + recherche texte sur recettes (titre/description/tags/type) et ingrédients (nom/rayon), via `CollapsibleSection` partagé | ✅ Livré | À valider sur téléphone |
| 1 | **F01 — Générateur de menus** — page `/calendar/generator` accessible depuis le bouton « Générer un menu… » de /calendar : plage de 1 à 30 jours (min = aujourd'hui), jours de semaine, types de repas et types de plats autorisés par repas, couverts, tags exclus, mode combler (créneaux vides) / remplacer (supprime les repas existants, notes libres incluses) ; respecte l'antidoublon F09 (fenêtre exclusive) et met à jour l'historique F08 — server action testée en runtime (34 PASS) | ✅ Livré | À valider sur le CT beta |
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

> Le journal complet des corrections (C-001 → C-030, avec descriptions, solutions et commits de référence) vit dans **[CORRECTIONS.md](CORRECTIONS.md)**.

| Indicateur | Valeur |
|---|---|
| Corrections enregistrées | 34 (C-001 → C-034) |
| Corrigées et déployées | 33 |
| En traitement côté appareil | 1 (C-027 : supprimer l'entrée parasite du gestionnaire de mots de passe) |
| Critiques | 3 — toutes trouvées par l'audit du 2026-10-08 (C-007, C-011, C-030) |
| Décisions en suspens | C-011 : purge de l'historique git + révocation des jetons pré-retrait |

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
| `main` | Production — tag `last-stable` sur la dernière version validée ; le CT de production suit `main` (fichier `.deploy-branch`, lu par `update.sh` et la page /deploy) |
| `beta` | Branche de test : déployée sur le CT de test, mise à jour via `pct exec <CT> -- bash /opt/meal_plan/update.sh` **ou depuis l'application** (Paramètres → Update) |
| `feature/*` | Une branche par fonctionnalité (vagues IA) — conservées sur GitHub pour revue |

Installation d'un conteneur (test ou production) : `bash scripts/proxmox-install.sh <CTID> <email> [mdp]` — ajouter `BRANCH=main` pour un conteneur de production (défaut : `beta`) et `CF_TUNNEL_TOKEN=<jeton>` pour installer le tunnel Cloudflare (cloudflared en service système, HTTPS extérieur sans ouverture de port). La branche est mémorisée dans `/opt/meal_plan/.deploy-branch`. Procédure complète de promotion et d'installation prod : **[DEPLOYMENT.md](DEPLOYMENT.md)** (section Production).

Déploiement complet (Proxmox + tunnel Cloudflare + dépannage) : **[DEPLOYMENT.md](DEPLOYMENT.md)**

---

## 🔗 Ressources et Références

- [Cahier des charges](meal_plan_requirements.md)
- [DEPLOYMENT.md](DEPLOYMENT.md) — guide de déploiement pas à pas (option script automatique incluse)
- [CORRECTIONS.md](CORRECTIONS.md) — journal complet des corrections (C-001 → C-030)
- [archives/ROADMAPV2.md](archives/ROADMAPV2.md) — historique de planification des phases 1-3
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
| **V3.3 (ce document)** | 2026-10-08 | Préparation de la production : correction C-032 (script d'installation), script multi-branche (`BRANCH=main`), `update.sh` suit `.deploy-branch`, section Production dans DEPLOYMENT.md, correction C-031 (UX calendrier) ; tunnel Cloudflare optionnel à l'installation (`CF_TUNNEL_TOKEN`, cloudflared en service système) + section dédiée dans DEPLOYMENT.md |
