# AGENTS.md — Contexte de travail pour agents IA

**Meal Plan** : application web familiale de planification des repas et gestion de recettes (PWA, auto-hébergée sur LXC Proxmox + tunnel Cloudflare). Monolithe Next.js : `app/` (pages + Server Actions + API), `lib/` (db, auth, règles métier), `drizzle/` (migrations). Commercialisation en préparation (licence à vie par foyer — voir `docs/plan-commercialisation.md`).

## Stack

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| UI | Tailwind CSS v4, @dnd-kit, PWA ; 5 palettes (F14) servies sans flash |
| Base de données | SQLite mono-fichier `data/sqlite.db` (better-sqlite3), Drizzle ORM — migrations versionnées `drizzle/`, réconciliation idempotente `db:ensure` |
| Auth | NextAuth v5 (JWT), Argon2 (@node-rs/argon2), rôles ADMIN/MEMBER/GUEST, sessions révalidées en base à chaque action |
| Validation | Zod v4 (`lib/validators/`) |
| Process | PM2 mode **fork** (jamais cluster avec SQLite) |

## Commandes

| Commande | Rôle |
|---|---|
| `npm ci` | installation |
| `npm run dev` / `build` / `start` | développement / build / production |
| `npm test` | tests runtime sur base jetable (`SQLITE_PATH`) — tourne en CI |
| `npm run test:import` / `test:onboarding` / `test:license` | tests runtime F07 / onboarding / licence — en CI |
| `npm run db:generate` | migration depuis `lib/db/schema.ts` (jamais de SQL manuel versionné) |
| `npm run db:migrate` / `db:ensure` | appliquer les migrations / réconcilier le schéma |
| `npm run seed` / `seed:clear` / `db:seed-ingredients` | données démo / bibliothèque 568 ingrédients |
| `npm run create-admin` | premier compte ADMIN |
| `bash update.sh [rollback]` | mise à jour prod : backup DB (10 conservées), reset, db:ensure+migrate, build, healthcheck, relance même en échec |
| `scripts/proxmox-install.sh` | installation conteneur LXC |

## Arborescence utile

```
app/actions/     auth · recipes · ingredients · meal-plan · shopping · suggestions · tokens · settings (gardes session + rôles)
app/api/         auth/[...nextauth] · calendar (ics + public JSON pour Home Assistant)
app/             calendar · recipes · ingredients · shopping-list · share · settings · stats · deploy · profile · register · reset-password · public/calendar
app/components/  PlannerBoard (calendrier DnD, modals, palette)
lib/             auth.ts · auth-guards.ts (requireSession/requireAdmin) · meal-planning.ts (historique, antidoublon) · validators/ · db/
drizzle/         migrations versionnées · data/sqlite.db (base suivie)
docs/            toute la documentation (kebab-case)
```

## Conventions (obligatoires)

- Branches : travail sur **`beta`** ; `main` = référence stable (tag `last-stable`) ; `feature/*` = une branche par fonctionnalité.
- Commits en français : `feat:` `fix:` `docs:` `chore:`.
- **Correctifs numérotés C-xxx** : toute modification non triviale = une entrée dans `docs/correctifs.md` (problème → correctif → tests → fichiers) + docs associées mises à jour dans le même commit.
- Migrations toujours par `db:generate` ; toute action serveur qui écrit en base est testée **en exécution** (tsc/build ne suffisent pas).
- **Racine du repo : uniquement `README.md` et ce fichier.** Toute la documentation dans `docs/`, kebab-case sans MAJUSCULES ni accents.
- **Sécurité** : aucun secret (token, clé API, mot de passe) dans le code, les commits ou les logs ; `.env.local` jamais commité. Un secret exposé ailleurs = alerte + révocation immédiate, puis nettoyage de l'historique si nécessaire.
- **Gate de sortie** (avant tout commit/PR) : `tsc` clean, tests runtime concernés au vert, entrée C-xxx si modification non triviale, docs associées à jour dans le même commit.
- Env : `AUTH_SECRET` obligatoire en production ; `AUTH_TRUST_HOST=true` ; `TZ=Europe/Paris` (fuseau critique pour les dates de repas). En commercialisation : `STRIPE_WEBHOOK_SECRET` (webhook signé) + `STRIPE_PAYMENT_LINK` (lien d'achat) dans `.env.local`.

## Routage documentaire — ne lire QUE ce qui est utile à la tâche

| Zone de travail | Lire |
|---|---|
| État du projet / restant | `docs/roadmap.md` |
| Exigences | `docs/cahier-des-charges.md` |
| Pourquoi d'un comportement existant | `grep -n "<mot-clé>" docs/correctifs.md` — **ne pas lire ce journal en entier** |
| Déploiement / dépannage | `docs/deploiement-proxmox.md`, `update.sh`, `scripts/proxmox-install.sh` |
| Utilisateur final | `docs/guide-utilisateur.md` |
| Commercialisation | `docs/plan-commercialisation.md` · `docs/plan-action-10k-foyers.md` · `docs/echecs-et-stripe.md` |
| Recette métier (parcours à tester) | `docs/test-scenarios.md` |
| Roadmaps historiques | `docs/archives/` |

## État du projet — SSOT : `docs/roadmap.md`

Ce fichier **ne reflète jamais l'état d'avancement** du projet : la source unique est `docs/roadmap.md`, mise à jour à chaque merge. Ne pas dupliquer ici les travaux en cours (une liste dupliquée = une dérive en sursis).

**Angles morts persistants** (ops, vérifiés le 06/11/2026) : le moniteur Uptime Kuma pointe encore sur `/login` au lieu de `/api/health` (à repointer, CT 111) ; licence du code non actée (reco : FSL-1.1).