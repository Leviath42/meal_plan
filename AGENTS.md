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
- Env : `AUTH_SECRET` obligatoire en production ; `AUTH_TRUST_HOST=true` ; `TZ=Europe/Paris` (fuseau critique pour les dates de repas).

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

## Travaux en cours (voir docs/roadmap.md)

Phase 4 : import de recettes par URL (F07), notifications (F10), garde-manger (F11), PWA hors-ligne (F12), OAuth. **Préparation commercialisation (phase 0)** : multi-tenant `household_id` (chantier prioritaire — schéma encore mono-famille), onboarding self-service (suppression de la validation ADMIN), export/import JSON complet. **Angles morts connus** : pas d'endpoint `/api/health` (sonde Uptime Kuma sur `/login` en contournement) ; licence du code non actée (reco : FSL-1.1).
