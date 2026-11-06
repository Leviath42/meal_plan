# Contrat de la vague 4b — F17 multi-tenant par foyer (figé avant W6)

*Base : `beta` @ f8d62c9 (vague 4a mergée : C-057 → C-061). Règle du processus : ce contrat est mergé sur `beta` AVANT le lancement de W6 ; W6 travaille SEUL (aucun worker en parallèle — le chantier touche toutes les tables/actions).*

**Décision fondatrice (propriétaire, 06/11/2026)** : le multi-tenant `household_id` reste prioritaire malgré le modèle auto-hébergé « un CT par foyer » — il sécurise l'ouverture future à l'hébergement mutualisé et fiabilise une instance partagée.

---

## 1. Model figé

### 1.1 Rattachement des tables

| Table | `household_id` | Règle |
|---|---|---|
| `users` | ✅ (déjà posé en 0008) | Un utilisateur appartient à exactement UN foyer ; sert de pivot — `requireSession` revalide le foyer en base à chaque action (comme le rôle) et l'expose comme `session.user.householdId` |
| `recipes` | ✅ | Recettes du foyer |
| `ingredients` | ✅ | Catalogue du foyer ; l'UNIQUE global sur `name` devient **par foyer** (index unique `(household_id, LOWER(name))` ou table de contrainte recréée par `db:generate`) — un foyer ne voit ni ne collisionne avec les ingrédients d'un autre |
| `recipe_ingredients` | ✅ (dénormalisé volontairement) | Liaisons recettes↔ingrédients du foyer — jointures filtrées sans traverse |
| `meal_plans` | ✅ | Planning du foyer (l'UNIQUE `(date, meal_type, recipe_id)` devient par foyer) |
| `shopping_items` | ✅ | Liste de courses du foyer |
| `pantry_items` | ✅ (déjà créé avec la table en 0008 ? NON — colonne à ajouter) | L'UNIQUE `(ingredient_id)` devient `(household_id, ingredient_id)` |
| `ingredient_standards` | ✅ | UNIQUE `(ingredient_id)` → `(household_id, ingredient_id)` |
| `feedback` | ✅ | Retours par foyer (spéc F15 : la colonne manquait, introduite ici) |
| `access_tokens` | ✅ | Jetons de partage par foyer — la page publique/ICS/JSON ne sert QUE le planning du foyer du jeton |
| `push_subscriptions` | ⟂ | Porté par `user_id` (transitif) — pas de colonne |
| `app_settings` | ❌ GLOBAL | Réglages d'INSTANCE (thème F14, maintenance) — inchangés en v1, documenté |
| `licenses` / `license_audit` / `households` | ❌ GLOBAL | Une licence = une instance (contrat v3 inchangé) — le modèle « licence par foyer sur instance mutualisée » sera tranché à l'ouverture d'un hébergement mutualisé, hors périmètre v1 |

### 1.2 Migration & backfill (mécanique figée)

1. **DDL par `db:generate` uniquement** (jamais de SQL manuel versionné) — y compris la re-création des tables nécessaires aux contraintes UNIQUE par foyer.
2. **Backfill idempotent AU RUNTIME** (pas dans le fichier de migration) : `lib/household.ts` expose `ensurePrimaryHousehold()` — au premier accès (middleware/action), si des lignes sans `household_id` existent, création du foyer « Foyer principal » et rattachement TOUTES les données préexistantes (users, recettes, ingrédients, planning, courses, stock, standards, feedback, jetons) à ce foyer, en transaction synchrone. Idempotent : deuxième exécution = no-op. Testé en exécution par `scripts/test-multi-tenant.ts`.
3. `users.household_id` reste nullable en base (SQLite alter contraint) mais **jamais null en pratique** après backfill ; toute action refuse un utilisateur sans foyer (garde `requireSession`).

### 1.3 Isolation (règle absolome)

- **Toute** lecture/écriture des tables ✅ filtre par le foyer de session : `.where(eq(t.householdId, hid))` à l'écriture et inclusion obligatoire à la lecture — interdiction de tout SELECT non filtré sur ces tables (grep de revue du chef).
- Un helper `lib/household.ts` (`getHouseholdId(session)` validé en base) est LE point de passage ; pas de composition maison.
- Partage public (`/public/calendar`, ICS, JSON Home Assistant) : jeton → foyer → planning du foyer uniquement.

### 1.4 Création de foyers (comportement figé)

- Variable d'environnement **`MULTI_HOUSEHOLDS`** (absente/fausse par défaut = comportement actuel inchangé) :
  - **OFF (défaut)** : `/register` raccroche le nouveau compte au foyer principal (famille unique — UX actuelle de l'instance auto-hébergée préservée) ;
  - **ON** : `/register` crée UN NOUVEAU foyer par inscription (design hébergement mutualisé) — l'inscription démarre avec un catalogue vide ; le bouton « remplir le catalogue » (réutilisation `scripts/seed-ingredients.ts` en mode ciblé par foyer) est proposé sur la page /welcome.
- Pas d'UI d'administration des foyers en v1 (hors périmètre, noté roadmap).

## 2. Périmètre de fichiers W6

- **Autorisés** : `lib/db/schema.ts`, `drizzle/` (via `db:generate`), `lib/household.ts`, `lib/auth.ts`, `lib/auth-guards.ts`, `app/actions/**` (filtres foyer), `app/**/page.tsx` & composants serveurs (filtres), `proxy.ts`, `app/register/**`, `app/welcome/**`, `scripts/seed-ingredients.ts` (mode foyer), `scripts/test-multi-tenant.ts`, docs (roadmap §4b, guide, test-plan §2 4b, correctifs C-062).
- **Interdits** : `app/Nav.tsx`, `package.json`, `.github/` (le chef branche le test), `public/sw.js` (aucun changement offline), `lib/license.ts` (périmètre global figé).

## 3. Critères d'acceptation (scénarios à la validation, résumés)

1. **Isolation totale** : deux foyers A/B sur la même instance — A ne voit RIEN de B sur TOUTES les pages (recettes, ingrédients, calendrier, courses, garde-manger, standards actifs, retours, jetons) et réciproquement ;
2. **Backfill** : la base mono-famille actuelle (données réelles CT) fonctionne à l'identique après migration — aucun changement visible pour l'instance mono-foyer ;
3. **Inscriptions** : OFF → nouveau membre du foyer principal (UX inchangée) ; ON → nouveau foyer isolé ;
4. **Partage** : un jeton du foyer A ne sert jamais le planning de B ;
5. **Runtime** : `scripts/test-multi-tenant.ts` — création 2 foyers, isolation par listage réel (requêtes de production), backfill idempotent, UNIQUE par foyer (même nom d'ingrédient dans les 2 foyers), jeton ciblé. Toutes les suites existantes (smoke 9, import 32, onboarding 3, licence 15, pantry 29, feedback 24, standards 19, export 34, notifications 27) restent vertes.

## 4. Fusion

Une fois W6 rendu (revue de conformité + grep d'isolation + suites au vert) : merge `beta` ← `feature/multi-tenant-household`, branchement `test:multi-tenant` (chef), CI, puis **validation humaine CT beta obligatoire avant toute promotion** (et le point de décision documented « licences par foyer sur instance mutualisée » reste ouvert côté commercialisation).
