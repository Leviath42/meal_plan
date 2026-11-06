// lib/household.ts — F17 multi-tenant par foyer (vague 4b, C-062).
//
// POINT DE PASSAGE UNIQUE du modèle foyer (contrat 4b §1.3) : toute
// lecture/écriture des tables rattachées filtre par le foyer de session ;
// `requireSession` (lib/auth-guards.ts) revalide le foyer en base à chaque
// action et l'expose comme `session.user.householdId` ; `getHouseholdId`
// extrait ce foyer validé ici.
//
// Le backfill (contrat 4b §1.2) est RUNTIME et idempotent : la migration
// drizzle pose uniquement les colonnes household_id (nullables en base,
// SQLite l'exige pour un ALTER) ; `ensurePrimaryHousehold()` rattache toutes
// les lignes préexistantes sans foyer au « Foyer principal » en transaction
// SYNCHRONE better-sqlite3. deuxième exécution = no-op.
import { eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  accessTokens,
  feedback,
  households,
  ingredientStandards,
  ingredients,
  mealPlans,
  pantryItems,
  recipeIngredients,
  recipes,
  shoppingItems,
  users,
} from '@/lib/db/schema';

// Nom du foyer créé par le backfill (l'instance mono-famille historique)
export const PRIMARY_HOUSEHOLD_NAME = 'Foyer principal';

// Session côté serveur après requireSession (foyer déjà revalidé en base)
type HouseholdSession = { user?: { householdId?: string | null } | null };

// Variable d'environnement MULTI_HOUSEHOLDS (contrat 4b §1.4) :
// absente/fausse (défaut) = une seule famille. Valeurs acceptées : 1/true/on/yes.
export function multiHouseholdsEnabled(): boolean {
  const raw = process.env.MULTI_HOUSEHOLDS?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes';
}

// Créer un foyer (design hébergement mutualisé : un foyer par inscription).
export function createHousehold(name: string): string {
  const created = db
    .insert(households)
    .values({ name })
    .returning({ id: households.id })
    .get();
  return created.id;
}

// Extrait le foyer d'une session déjà revalidée en base par requireSession.
// refuse un compte sans foyer : isolation FOYER avant toute donnée.
export function getHouseholdId(session: HouseholdSession): string {
  const householdId = session.user?.householdId;
  if (!householdId) {
    throw new Error('Session invalide : ce compte n’est rattaché à aucun foyer');
  }
  return householdId;
}

// Backfill runtime idempotent (contrat 4b §1.2.2) : crée le « Foyer principal »
// s'il n'existe pas, puis rattache TOUTES les lignes sans foyer (comptes,
// recettes, catalogue, liaisons, planning, courses, stock, standards, retours,
// jetons de partage) à ce foyer. Transaction SYNCHRONE better-sqlite3
// (un callback async est refusé par drizzle — C-047). Retourne l'id du foyer.
// DEUXIÈME exécution = no-op (plus aucune ligne NULL).
export function ensurePrimaryHousehold(): string {
  return db.transaction((tx) => {
    const [existing] = tx
      .select({ id: households.id })
      .from(households)
      .where(eq(households.name, PRIMARY_HOUSEHOLD_NAME))
      .limit(1)
      .all();
    const householdId =
      existing?.id ??
      tx
        .insert(households)
        .values({ name: PRIMARY_HOUSEHOLD_NAME })
        .returning({ id: households.id })
        .get().id;

    // Rattachement des lignes préexistantes (idle : aucune ligne NULL).
    // household_id ne porte pas de clé étrangère volontairement (cohérent
    // avec users.household_id posé par la migration 0008).
    tx.update(users).set({ householdId }).where(isNull(users.householdId)).run();
    tx.update(recipes).set({ householdId }).where(isNull(recipes.householdId)).run();
    tx.update(ingredients).set({ householdId }).where(isNull(ingredients.householdId)).run();
    tx.update(recipeIngredients).set({ householdId }).where(isNull(recipeIngredients.householdId)).run();
    tx.update(mealPlans).set({ householdId }).where(isNull(mealPlans.householdId)).run();
    tx.update(shoppingItems).set({ householdId }).where(isNull(shoppingItems.householdId)).run();
    tx.update(pantryItems).set({ householdId }).where(isNull(pantryItems.householdId)).run();
    tx.update(ingredientStandards).set({ householdId }).where(isNull(ingredientStandards.householdId)).run();
    tx.update(feedback).set({ householdId }).where(isNull(feedback.householdId)).run();
    tx.update(accessTokens).set({ householdId }).where(isNull(accessTokens.householdId)).run();

    return householdId;
  });
}

// Foyer du compte connecté, revalidé en base (jamais déduit du JWT seul —
// le JWT de 30 jours peut être obsolète, même règle que le rôle). Si le
// compte n'a pas encore de foyer (installation pré-4b, données backfillées
// à la volée), le backfill runtime le rattache au foyer principal.
// Retourne null si le compte est introuvable.
export function resolveHouseholdIdForUser(userId: string): string | null {
  const read = () =>
    db
      .select({ householdId: users.householdId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .get();

  let user = read();
  if (!user) return null;
  if (user.householdId) return user.householdId;

  // Compte sans foyer (installation pré-4b) : backfill runtime — toutes les
  // données orphelines ET ce compte sont rattachés au foyer principal.
  ensurePrimaryHousehold();
  user = read();
  return user?.householdId ?? null;
}
