# Meal Plan 🍳

**Application web familiale de planification des repas et gestion de recettes** — auto-hébergée (Proxmox), accessible à la maison comme à l'extérieur.

---

## ✨ Fonctionnalités

### Planification (F01)
- Calendrier partagé `PlannerBoard` : accueil 7 jours (J → J+6), page `/calendar` 19 jours (J → J+18), navigation par jour et par mois
- Glisser-déposer des repas entre créneaux + zone de suppression contextuelle ; **palette de recettes** draggable vers un créneau vide
- 4 types de repas (petit-déjeuner, déjeuner, goûter, dîner), plusieurs plats par créneau, repas sans recette (note libre)
- Modals de création/modification/replanification/suppression, couverts par repas, dates passées refusées (fuseau local)

### Recettes & ingrédients (F02)
- CRUD complet, association recettes-ingrédients avec quantités, type de plat (`mealCourse`), tags, temps de préparation/cuisson
- Ingrédients organisés par rayons de supermarché, unités par défaut

### Liste de courses (F05)
- Génération automatique depuis le planning (7/14/30 jours) : extraction, mise à l'échelle par le nombre de couverts, fusion des doublons
- Affichage par rayons, cases à cocher persistées, ajout manuel, copie en texte brut

### Partage (F04)
- Jetons d'accès cryptographiques (création/révocation/expiration) gérés par l'ADMIN (`/share`)
- Page publique en lecture seule `/public/calendar?token=…`, export **ICS** (90 jours), API JSON pour Home Assistant (`/api/calendar/public?token=…`)

### Intelligence (F03 / F08 / F09)
- **Suggestions** : 3 recettes proposées dans le modal de création, excluant celles déjà planifiées dans la fenêtre antidoublon
- **Historique** : date du dernier repas par recette, indicateur dans le calendrier
- **Antidoublon** : intervalle minimum configurable par utilisateur (`/settings` → Mes préférences, 0 = désactivé, défaut 7 jours)

### Authentification & comptes (F06)
- NextAuth v5 (JWT), Argon2, rôles ADMIN / MEMBER / GUEST (comptes créés en attente de validation)
- Réinitialisation par question secrète, page profil, interface d'administration des comptes
- Sessions revalidées en base à chaque action (rétrogradation/suppression effectives immédiatement)

### Interface
- Mobile-first, mode sombre complet (bascule dans la navigation), thème teal unifié, formulaires qui conservent les champs en erreur

---

## 🚀 Démarrage rapide

```bash
npm ci

# Configuration (créer .env.local à la racine — jamais versionné)
# AUTH_SECRET=<openssl rand -base64 32>   ← OBLIGATOIRE en production
# AUTH_TRUST_HOST=true
# TZ=Europe/Paris

npm run db:migrate        # crée le schéma (base vierge)
npm run create-admin -- ton@email.fr 'MotDePasse'   # premier compte ADMIN
npm run seed              # optionnel : 45 recettes + 108 ingrédients de démo

npm run dev               # développement
# ou
npm run build && npm start   # production
```

### Scripts npm

| Script | Rôle |
|--------|------|
| `dev` / `build` / `start` | Développement / build production / serveur production |
| `db:generate` | Génère une migration depuis le schéma (après modification de `lib/db/schema.ts`) |
| `db:migrate` | Applique les migrations (`drizzle/`) |
| `seed` / `seed:clear` | Remplit / vide les données de démonstration |
| `create-admin` | Crée un compte ADMIN (email et mot de passe en arguments, ou `ADMIN_EMAIL`/`ADMIN_PASSWORD`) |

> ⚠️ `AUTH_SECRET` est **obligatoire** : l'application refuse de démarrer en production sans lui. Le fuseau horaire du serveur doit être `Europe/Paris` (voir DEPLOYMENT.md).

---

## 🏗️ Stack Technique

| Couche | Technologie |
|-------|-------------|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| UI | Tailwind CSS v4 |
| Drag & drop | @dnd-kit |
| ORM | Drizzle ORM (migrations versionnées dans `drizzle/`) |
| Base de données | SQLite (better-sqlite3) — un seul fichier `data/sqlite.db` |
| Authentification | NextAuth v5 (JWT) |
| Hashage | Argon2 (@node-rs/argon2) |
| Validation | Zod v4 |

---

## 🗂️ Architecture du Projet

```
meal_plan/
├── app/
│   ├── actions/              # Server Actions (gardes de session + rôles)
│   │   ├── auth.ts           # comptes, rôles, reset password
│   │   ├── recipes.ts        # recettes (transactions)
│   │   ├── ingredients.ts    # ingrédients
│   │   ├── meal-plan.ts      # planification (historique + antidoublon)
│   │   ├── shopping.ts       # liste de courses
│   │   ├── suggestions.ts    # propositions de repas
│   │   ├── tokens.ts         # jetons de partage
│   │   └── settings.ts       # paramètres (couverts par défaut, préférences)
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   └── calendar/         # ics (export agenda) + public (API JSON)
│   ├── calendar/             # page calendrier 19 jours
│   ├── components/PlannerBoard.tsx   # calendrier partagé (DnD, modals, palette)
│   ├── ingredients/ · recipes/ · login/ · profile/ · register/ · reset-password/
│   ├── shopping-list/        # liste de courses
│   ├── share/                 # gestion des jetons (ADMIN)
│   ├── settings/              # page de paramétrage
│   └── public/calendar/       # page publique (jeton)
├── lib/
│   ├── auth.ts               # configuration NextAuth
│   ├── auth-guards.ts        # requireSession / requireAdmin (revalidation en base)
│   ├── meal-planning.ts      # règles partagées (historique, fenêtre antidoublon)
│   ├── validators/           # schémas Zod
│   └── db/                   # schema.ts, index.ts, seed.ts
├── drizzle/                  # migrations versionnées
├── data/sqlite.db            # base de données (suivie pour les données de test)
├── scripts/                  # proxmox-install.sh (installation automatique), create-admin.ts
├── DEPLOYMENT.md             # guide de déploiement Proxmox + Cloudflare
├── ROADMAPV3.md              # roadmap courante (tests, corrections, phase 4)
└── archives/                 # roadmaps précédentes
```

---

## 📦 Déploiement

Tout est documenté dans **[DEPLOYMENT.md](DEPLOYMENT.md)** :

- **Option A — script automatique** : une commande depuis le Shell de l'hôte Proxmox crée le conteneur et installe tout (`scripts/proxmox-install.sh`, v5) ;
- **Option B — manuelle pas à pas** (avec le pourquoi de chaque étape) ;
- **Tunnel Cloudflare nommé** pour un accès extérieur HTTPS ;
- Mise à jour de la beta : `pct exec <CTID> -- bash /opt/meal_plan/update.sh` ;
- Tableau de dépannage (AUTH_SECRET, OOM du build, fuseau horaire, etc.).

---

## 🧪 Tests et corrections

L'état des validations manuelles et la liste des corrections se trouvent dans **[ROADMAPV3.md](ROADMAPV3.md)** :

- section « **Campagne de tests en cours** » : checklists de validation par fonctionnalité ;
- section « **CORRECTIONS** » : tableau à alimenter pendant les tests (une ligne par problème).

---

## 🗺️ Roadmap

Phases 1 à 3 du cahier des charges : **terminées**. Restent (phase 4) : import de recettes par URL (F07), notifications (F10), garde-manger (F11), PWA hors-ligne (F12), OAuth. Détails et estimations : [ROADMAPV3.md](ROADMAPV3.md).

---

## 🤝 Organisation Git

| Branche | Rôle |
|---------|------|
| `main` | Référence stable, tag `last-stable` |
| `beta` | Branche de test (déployée sur le conteneur Proxmox) |
| `feature/*` | Vagues de développement IA supervisées (une branche par fonctionnalité) |

Conventions : commits en français (`feat:`, `fix:`, `chore:`, `docs:`), les migrations passent toujours par `db:generate` (jamais de SQL manuel versionné), toute action serveur qui écrit en base doit être testée en exécution (tsc/build ne suffisent pas).

---

## 📄 Documentation

- **[ROADMAPV3.md](ROADMAPV3.md)** — roadmap courante, tests, corrections, phase 4
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — déploiement Proxmox + Cloudflare
- **[meal_plan_requirements.md](meal_plan_requirements.md)** — cahier des charges
- [archives/](archives/) — roadmaps historiques

---

*Application développée pour simplifier la planification des repas familiaux — projet auto-hébergé, développé par vagues de travail IA supervisées.*
