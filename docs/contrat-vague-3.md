# Contrat de la vague 3 — commercialisation (figé avant workers)

*Base : `beta` @ af862c4 (C-046 → C-049 livrés et déployés sur CT 104). Règle du processus : ce contrat est mergé sur `beta` AVANT le lancement des workers ; toute évolution passe par une nouvelle PR.*

Modèle retenu : **licence à vie par foyer, une instance = un foyer** (hébergement dédié VPS ~8 €/mois côté client ou instance maison). Le multi-tenant `household_id` (CDC §5, option A) reste hors périmètre de cette vague — à activer seulement si l'hébergement mutualisé devient réel.

---

## 1. Schéma figé (migration `0007`)

- `licenses` : `license_key` **hashée** (sha256:) unique, `status` active/suspended/revoked, `cgv_version` + `licensed_at` (traçabilité art. 19 CGV), `stripe_session_id` unique (idempotence webhook), `stripe_customer_id`, `suspended_at`/`suspension_reason`/`reactivated_at`.
- `license_audit` : action (activated/suspended/reactivated/revoked/refunded), reason, by_user_id, at — toute action admin tracée.
- Réparation incluse : chaîne de snapshots drizzle réparée (`0005_snapshot.json` reconstruit après perte en purge C-011, `prevId` corrigés).

## 2. Routes figées

| Route | Rôle |
|---|---|
| `POST /api/stripe/webhook` | Webhook Stripe : signature vérifiée, idempotent (`stripe_session_id`), métadonnées `cgv_version` + `license_date` enregistrées |
| `GET /activate` + action `activateLicense` | Saisie de la clé de licence (hash sha256, activation) |
| `GET /admin/licenses` (ADMIN) | Liste des licences, suspendre/réactiver avec raison (écrit `license_audit`) |
| `lib/license.ts` `getLicenseStatus()` | Règle figée : aucune licence active → **essai 30 jours** depuis la première mise en service, puis **lecture seule** (écritures refusées, export JSON autorisé). *Recommandation D1/D4 — à confirmer par le propriétaire avant W3.* |
| `GET /recipes/import` + `app/actions/import-recipe.ts` | F07 import de recette par URL |
| `GET /welcome` | Page d'accueil post-inscription (onboarding) |

Garde licence dans `proxy.ts` : pages protégées → si essai expiré et pas de licence active, lecture seule (les server actions d'écriture retournent une erreur explicite "licence requise").

## 3. Workers (un par chantier, worktree + branche `feature/*` dédiés)

| Worker | Branche | Fichiers autorisés | Interdits | Critères d'acceptation |
|---|---|---|---|---|
| **W1 — F07 import recette par URL** | `feature/f07-import-url` | `app/actions/import-recipe.ts`, `app/recipes/import/**`, bouton dans `app/recipes/page.tsx` | schéma, `proxy.ts`, auth, licence | extraction JSON-LD Schema.org Recipe + fallback Marmiton/750g, prévisualisation avant création, doublon de titre → suffixe, **test runtime** de l'action (écriture recette en base) |
| **W2 — Onboarding self-service** | `feature/onboarding-self-service` | `app/actions/auth.ts` (register → MEMBER direct), `app/register/**`, `app/welcome/**` | schéma, `proxy.ts`, licence | S01 : inscription instantanée sans validation ADMIN, rate limit conservé, redirection `/welcome`, test runtime |
| **W3 — Licence par foyer + Stripe** | `feature/licence-stripe` | `lib/license.ts`, `app/activate/**`, `app/api/stripe/webhook/**`, `app/admin/licenses/**`, `app/actions/license.ts`, garde dans `proxy.ts` | F07, onboarding | S05/S06/S08/S09 : Checkout + webhook signé idempotent (test mode d'abord), activation < 1 min, métadonnées `cgv_version`/`license_date`, suspension/réactivation tracée dans `license_audit`, test runtime du webhook |

## 4. Ordre de fusion sur `beta`

1. Ce contrat (schéma 0007 + routes figées). 2. W1 (F07). 3. W2 (onboarding). 4. W3 (licence/Stripe — touche `proxy.ts`, dernier).

## 5. Règles communes (rappel)

Commits en français (`feat:`/`fix:`/`docs:`) · correctifs C-050+ dans `docs/correctifs.md` + docs MAJ dans le même commit · toute action serveur qui écrit en base testée **en exécution** (`npm test` + tests dédiés) · CI verte (lint + typecheck + build + tests + audit, désormais sur `main` et `beta`) · pas de secret dans le repo.
