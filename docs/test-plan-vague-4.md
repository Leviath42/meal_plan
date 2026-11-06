# Plan de test — vague 4 (F10 à F16, F18) et procédures de débogage

*Appliqué par les workers avant PR, puis par le chef de projet à chaque fusion (§4 du contrat), puis validation humaine sur CT beta. Toute action serveur qui écrit en base est testée **en exécution** — `tsc`/`build` ne détectent ni les transactions async refusées par better-sqlite3 (C-047), ni le SQL invalide « ilike » qui passait la CI (C-055).*

---

## 1. Gates automatisées (à chaque PR, dans l'ordre)

| # | Gate | Commande | Attendu |
|---|---|---|---|
| 1 | Lint | `npx eslint .` | 0 erreur |
| 2 | Types | `npx tsc --noEmit` | 0 erreur |
| 3 | Build | `AUTH_SECRET=x AUTH_TRUST_HOST=true npm run build` | OK (le build exige AUTH_SECRET) |
| 4 | Smoke | `npm test` | 9 PASS |
| 5 | Feature courante | `npx tsx scripts/test-<feature>.ts` | N PASS, exit 0 |
| 6 | Non-régression | `npm run test:import` (32), `test:onboarding` (3), `test:license` (15) | Tous PASS |
| 7 | Runtime réel (chef de projet) | build + `npm run start` sur base jetable, login NextAuth, parcours mini de la feature via HTTP | Comportement conforme, 0 SqliteError en log |

Pattern des tests runtime : base jetable `SQLITE_PATH` + `db-ensure` (cf. `scripts/test-import-recipe.ts`), un `check()` par assertion avec libellé explicite, `process.exit(1)` au premier FAIL, tests sous Windows aussi (`shell: process.platform === 'win32'` pour `npx`, `rmSync` en meilleur-effort).

## 2. Scénarios par fonctionnalité

### W1 — F10 notifications + F12 complément
- **N1 Push** : `/profile` → activer les notifications (heure 07:00) → autoriser le navigateur → ligne `push_subscriptions` créée (vérif sqlite : `SELECT endpoint, user_id FROM push_subscriptions;`). Désactiver → ligne supprimée, heure null.
- **N2 Envoi** : appeler l'endpoint push avec `NOTIFICATIONS_SECRET` → 200 ; sans secret → 401/403. Un repas planifié aujourd'hui → titre du repas dans la payload ; aucun repas → rien envoyé ; `notify_time` null → abonné ignoré.
- **N3 Cron** : runbook du CT (cron + `.env.local` VAPID) documenté par W1 dans `docs/deploiement-proxmox.md`.
- **O1 Offline** : avion mode ON (DevTools → Network offline) → `/calendar` et `/recipes` consultables depuis le cache SW ; écriture impossible sans crash (message offline propre).
- **O2 Retour en ligne** : recharger → données fraîches (pas de planning périmé servi du cache au-delà de la stratégie définie).
- **O3 Déconnexion** : le SW vide les caches (comportement déjà en place dans `Nav.tsx` — non régressé).
- **O4 Version SW** : bump de version visible dans `public/sw.js` + purge des caches antérieurs à l'activation (règle anti-dérive C-038).

### W2 — F11 garde-manger
- **P1 CRUD** : `/pantry` → saisir 200 g de farine (décimale 0,5 acceptée), relevé en base ; unité éditée, ligne unique par ingrédient (contrainte unique).
- **P2 Péremption** : date passée → badge/avertissement visuel ; date future → rien.
- **P3 Exclusion courses** : recette « 500 g de farine » avec 200 g en stock → la génération de courses demande **300 g** ; stock ≥ besoin → article absent ; deux recettes cumulées → soustraction de la somme.
- **P4 Stock fraîchement modifié** : régénérer la liste après changement de stock → recalcul exact (pas de cache).
- **P5 Permissions** : MEMBER écrit, GUEST refusé (403/action refusée), aucune fuite entre rôles.

### W3 — F15 feedback
- **F1 Parcours 3 clics** : nav « Retours » → catégorie → message → envoyer ; ligne en base avec `page_url` (page d'origine), `app_version`, `status='nouveau'`.
- **F2 Validation** : message vide refusé (Zod), catégorie hors enum refusée, > 1000 caractères refusé ; GUEST refusé.
- **F3 Rate limit** : 6 envois en < 1 h → le 6e refusé proprement (message, pas de 500).
- **F4 Admin** : `/admin/feedback` → statuts nouveau→trié→traité/rejeté, filtres par catégorie, compteur cohérent ; MEMBER → /admin/feedback refusé.
- **F5 Espacement** : le modal/la page fonctionne en mode sombre (aucune classe `dark:` — vérif `grep -rn "dark:" app/feedback app/admin/feedback`).

### W4 — F16 quantités standard
- **Q1 Mise à l'échelle** : standard « 100 g / 1 pers. » ; recette à 4 couverts → champ pré-rempli « 400 g » ; couverts passés de 4 à 6 → recalcul « 600 g » en direct (ou au changement effectif — tel que spécifié dans le PR).
- **Q2 Ajustable** : la valeur pré-remplie reste modifiable manuellement et c'est la valeur saisie qui est enregistrée.
- **Q3 Sans standard** : ingrédient sans ligne `ingredient_standards` → comportement strictement identique à aujourd'hui (champ vide).
- **Q4 Seed** : `npm run db:seed-standards` quand il sera branché — idempotent, 2e passage 100 % ignoré, ne touche aucune donnée existante (vérif compter lignes avant/après).

### W5 — F18 export/import
- **E1 Export complet** : `/settings` (ADMIN) → export → JSON contenant recettes + liaisons + ingrédients + planning + garde-manger + paramètres ; **aucun** mot de passe, hash, jeton, clé de licence ; horodatage + version de schéma dans l'enveloppe.
- **E2 Import neuf** : sur base vierge → import du fichier E1 → même nombre de recettes/ingrédients/repas, types de plats et dates *identiques au jour près* (fuseaux : `TZ=Europe/Paris`).
- **E3 Atomicité** : fichier corrompu ou refusé au milieu (ex. ingrédient invalide en 12e position) → **rien** d'écrit (transaction), message d'erreur explicite.
- **E4 Doublons** : import sur base déjà peuplée → titres suffixés « (2) » (règle antidoublon actuelle respectée), pas d'écrasement silencieux.
- **E5 Essai expiré** : licence absente + essai > 30 j → export TOUJOURS autorisé, import refusé (cohérent garde proxy v3).

### Vague 4b — F17 multi-tenant (contrat dédié) — ✅ vérifié en exécution 06/11/2026 (W6, C-062)
- **Runtime** : `scripts/test-multi-tenant.ts` **45 PASS** sur base jetable SQLITE_PATH + db-ensure — backfill idempotent des 10 tables rattachées (« Foyer principal », 2e appel no-op), 2 foyers créés sur la même instance, isolation réelle PAR LISTAGES DE PRODUCTION (garde-manger `listPantryItems`, courses `generateShoppingRows` avec déduction de stock et régénération croisée sans destruction, repas du jour `getTodayMeals`, export `buildExportEnvelope`, standards `getIngredientStandardsMap`, antidoublon `findPlanInWindow` par foyer, suggestions, feedback borné), UNIQUE par foyer (même nom d'ingrédient accepté dans les DEUX foyers, rejeté en double dans le même), jeton de partage ciblé (jeton pré-4b raccroché au principal, le jeton de A ne sert JAMAIS le planning de B), MULTI_HOUSEHOLDS OFF/ON/valeurs invalides.
- **Non-régression** : suites 4a passées SANS modification — smoke 9, import 32, onboarding 3, licence 15, pantry 29, feedback 24, standards 19, export 34, notifications 27 PASS ; eslint 0 erreur, tsc, build (AUTH_SECRET), `db:migrate` et `db:ensure` idempotent (3 exécutions = no-op) sur base jetable.
- **Reste au chef (gate 7 + revue)** : runtime HTTP réel (login NextAuth, parcours mini inter-foyers via HTTP), grep d'isolation, branchage `test:multi-tenant` en CI, puis **validation humaine CT beta obligatoire**.
- **Rollback** : migration purement additive (colonnes + index) ; `bash update.sh rollback` restaure la sauvegarde DB prise avant mise à jour (10 conservées) ; le backfill ne détruit jamais de données (il n'écrit qu'un identifiant de foyer commun).

## 3. Régression minimale avant promotion `beta → main`

Rejouer les scénarios de [test-scenarios.md](test-scenarios.md) + : import URL (vérif rapide sur 2 vraies pages Marmiton), génération de courses standard (sans stock), générateur de menus, ajout recette manuelle (sans pré-remplissage standard), installation PWA Android + ouverture hors-ligne, mode sombre sur chaque nouvelle page, menu mobile < 400 px (les deux nouveaux liens tiennent), CSP pas cassée (aucune console d'erreur CSP en prod-like).

## 4. Procédures de débogage (leçons C-049 → C-056)

1. **Reproduire avant de corriger** : base jetable + serveur réel si le bug implique une action serveur — login NextAuth par script (csrf + `POST /api/auth/callback/credentials`), invocation de l'action par POST « progressive » avec champs `$ACTION_REF_1` / `$ACTION_1:0` / `$ACTION_1:1` / `$ACTION_KEY` (méthode validée en C-055), lecture du SqliteError dans la sortie `next start`.
2. **Échecs SQL silencieux en CI** : si un test réplique le code Métier en le réécrivant, il voit un vert de façade (C-055) → le test DOIT exécuter la même requête (helper partagé) ou l'action réelle.
3. **Erreurs classiques à chercher en premier** : `ilike()` (PostgreSQL, pas SQLite) ; classe `dark:` (contour-productive, le remappage `:root.dark` gère tout) ; effet de bord au rendu React (`router.push` → `useEffect`) ; transaction `await` avec better-sqlite3 (synchrone uniquement) ; mutation pendant le rendu ; jamais `execFileSync('npx')` sans `shell: win32`.
4. **Logs prod CT** : `pct exec <CT> -- bash /opt/meal_plan/reboot-log.sh` sinon `pm2 logs meal_plan --lines 100` ; en local Windows : lancer `npm run start` via le runtime process et lire la sortie (stderr contient les `⨯ SqliteError` complets).
5. **SQLite à la main pendant le bug** : `node -e "…require('better-sqlite3'…)"` en readonly (`fileMustExist`) ou sqlite3 CLI ; journal des migrations `__drizzle_migrations` — après tout souci de migration : `db:ensure` sur base jetable + `npm test`.
6. **Toute correction non triviale** : entrée C-xxx (problème → correctif → tests → fichiers) + docs associées dans le même commit.
