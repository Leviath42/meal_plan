// scripts/test-multi-tenant.ts
// Test runtime F17 (vague 4b, C-062) — critères d'acceptation §3.5 du contrat :
//  2 foyers créés sur la même instance, isolation RÉELLE par listages
//   (requêtes de production — modules partagés app/pantry/queries,
//   app/shopping-list/queries, lib/standards, lib/notifications, lib/export,
//   lib/meal-planning, app/actions/tokens — leçon C-055 : jamais une réplique),
//   backfill idempotent, UNIQUE par foyer (même nom d'ingrédient dans les deux
//   foyers), jeton de partage ciblé (le jeton du foyer A ne sert pas B),
//   MULTI_HOUSEHOLDS ON/OFF.
// Base jetable SQLITE_PATH + db-ensure (pattern scripts/test-import-recipe.ts).

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mealplan-multitenant-'));
const dbPath = path.join(tmpDir, 'multi-tenant.db');
process.env.SQLITE_PATH = dbPath;

let passed = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  passed++;
  console.log(`PASS ${name}`);
}

async function main() {
  // shell:true sous Windows : spawnSync('npx') y échoue (npm y expose npx.cmd)
  execFileSync('npx', ['tsx', 'scripts/db-ensure.ts', path.join(process.cwd(), 'drizzle'), dbPath], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  const { db } = await import('../lib/db');
  const {
    users,
    recipes,
    ingredients,
    recipeIngredients,
    mealPlans,
    shoppingItems,
    pantryItems,
    ingredientStandards,
    feedback,
    accessTokens,
    households,
  } = await import('../lib/db/schema');
  const { eq, isNull } = await import('drizzle-orm');
  const Argon2 = (await import('@node-rs/argon2')).default;
  const {
    ensurePrimaryHousehold,
    createHousehold,
    multiHouseholdsEnabled,
    resolveHouseholdIdForUser,
    PRIMARY_HOUSEHOLD_NAME,
  } = await import('../lib/household');
  const {
    listPantryItems,
    upsertPantryItem,
  } = await import('../app/pantry/queries');
  const { generateShoppingRows } = await import('../app/shopping-list/queries');
  const { getIngredientStandardsMap } = await import('../lib/standards');
  const { getTodayMeals } = await import('../lib/notifications');
  const { buildExportEnvelope } = await import('../lib/export');
  const {
    createFeedback,
    updateFeedbackStatus,
  } = await import('../lib/validators/feedback');
  const {
    findPlanInWindow,
    findSuggestableRecipes,
  } = await import('../lib/meal-planning');
  const { validateAccessToken } = await import('../app/actions/tokens');
  const { requireSession } = await import('../lib/auth-guards');

  const hashPassword = await Argon2.hash('x');
  const today = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = iso(today);
  const in3Days = iso(new Date(today.getTime() + 3 * 24 * 3600 * 1000));

  // ==========================================================================
  // 0. Données préexistantes « mono-famille » (SANS foyer — base pré-4b)
  // ==========================================================================
  const [oldUser] = await db
    .insert(users)
    .values({ email: 'ancien@test.local', password: hashPassword, role: 'ADMIN' })
    .returning();
  const [oldRecipe] = await db
    .insert(recipes)
    .values({ title: 'Gratin pré-4b', prepTime: 10, cookTime: 30, defaultServings: 4, instructions: 'Cuire' })
    .returning();
  const [oldIngredient] = await db
    .insert(ingredients)
    .values({ name: 'Farine pré-4b', category: 'Épicerie', defaultUnit: 'g' })
    .returning();
  await db.insert(recipeIngredients).values({ recipeId: oldRecipe.id, ingredientId: oldIngredient.id, quantity: 500, unit: 'g' });
  await db.insert(mealPlans).values({ date: todayStr, mealType: 'Soir', recipeId: oldRecipe.id, servings: 4 });
  await db.insert(shoppingItems).values({ manualName: 'Papier cuisson', quantity: 1, unit: 'pièce', isBought: false, addedManually: true });
  await db.insert(pantryItems).values({ ingredientId: oldIngredient.id, quantity: 200, unit: 'g' });
  await db.insert(ingredientStandards).values({ ingredientId: oldIngredient.id, quantity: 100, unit: 'g', servingsRef: 4 });
  await db.insert(feedback).values({ userId: oldUser.id, category: 'bug', message: 'Retour pré-4b' });
  const clearTokenA = 'tok-multi-tenant-a';
  await db.insert(accessTokens).values({
    token: `sha256:${createHash('sha256').update(clearTokenA).digest('hex')}`,
    createdByUserId: oldUser.id,
    type: 'calendar_read',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  });

  // ==========================================================================
  // 1. Backfill runtime idempotent (contrat §1.2) : tout → Foyer principal
  // ==========================================================================
  const hidA = ensurePrimaryHousehold();
  check('1 : backfill crée le foyer « principal »', hidA.length > 0);

  const [primaryHousehold] = await db.select().from(households).where(eq(households.id, hidA));
  check('1 : le foyer principal porte le nom figé', primaryHousehold?.name === PRIMARY_HOUSEHOLD_NAME);

  const orphans = (
    await Promise.all([
      db.select({ id: users.id }).from(users).where(isNull(users.householdId)),
      db.select({ id: recipes.id }).from(recipes).where(isNull(recipes.householdId)),
      db.select({ id: ingredients.id }).from(ingredients).where(isNull(ingredients.householdId)),
      db.select({ id: recipeIngredients.id }).from(recipeIngredients).where(isNull(recipeIngredients.householdId)),
      db.select({ id: mealPlans.id }).from(mealPlans).where(isNull(mealPlans.householdId)),
      db.select({ id: shoppingItems.id }).from(shoppingItems).where(isNull(shoppingItems.householdId)),
      db.select({ id: pantryItems.id }).from(pantryItems).where(isNull(pantryItems.householdId)),
      db.select({ id: ingredientStandards.id }).from(ingredientStandards).where(isNull(ingredientStandards.householdId)),
      db.select({ id: feedback.id }).from(feedback).where(isNull(feedback.householdId)),
      db.select({ id: accessTokens.id }).from(accessTokens).where(isNull(accessTokens.householdId)),
    ])
  ).flat();
  check('1 : backfill rattache TOUTES les lignes (10 tables, 0 orphelin)', orphans.length === 0);

  check(
    '1 : les lignes préexistantes appartiennent bien AU foyer principal',
    (await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.householdId, hidA))).length === 1 &&
      (await db.select({ id: accessTokens.id }).from(accessTokens).where(eq(accessTokens.householdId, hidA))).length === 1,
  );

  // ==========================================================================
  // 2. Idempotence : 2e exécution = no-op, même foyer
  // ==========================================================================
  const hidA2 = ensurePrimaryHousehold();
  check('2 : backfill idempotent (même id de foyer)', hidA2 === hidA);
  const primaryCount = (await db.select({ id: households.id }).from(households).where(eq(households.name, PRIMARY_HOUSEHOLD_NAME))).length;
  check('2 : aucun foyer « principal » dupliqué', primaryCount === 1);

  check(
    '2 : resolveHouseholdIdForUser revalide en base (compte ancien)',
    (await resolveHouseholdIdForUser(oldUser.id)) === hidA,
  );
  check('2 : resolveHouseholdIdForUser refuse un compte inconnu', (await resolveHouseholdIdForUser('inexistant')) === null);

  try {
    await requireSession();
    check('2 : requireSession sans session connectée → refus', false);
  } catch (e) {
    check('2 : requireSession sans session connectée → refus', e instanceof Error);
  }

  // ==========================================================================
  // 3. Deuxième foyer (design hébergement mutualisé)
  // ==========================================================================
  const hidB = createHousehold('Foyer B');
  check('3 : foyer B créé, distinct du principal', hidB !== hidA && hidB.length > 0);

  const [userB] = await db
    .insert(users)
    .values({ email: 'b@test.local', password: hashPassword, role: 'MEMBER', householdId: hidB })
    .returning();

  // Catalogue : MÊME nom dans les deux foyers (UNIQUE par foyer, §3.5)
  const [ingA] = await db
    .insert(ingredients)
    .values({ name: 'Farine', category: 'Épicerie', defaultUnit: 'g', householdId: hidA })
    .returning();
  const [ingB] = await db
    .insert(ingredients)
    .values({ name: 'Farine', category: 'Épicerie', defaultUnit: 'g', householdId: hidB })
    .returning();
  check('3 : même nom d’ingrédient accepté dans les DEUX foyers', !!ingA?.id && !!ingB?.id && ingA.id !== ingB.id);

  let duplicateRejected = false;
  try {
    await db.insert(ingredients).values({ name: 'Farine', category: 'Épicerie', defaultUnit: 'g', householdId: hidA });
  } catch (e) {
    duplicateRejected = /UNIQUE/i.test(String(e));
  }
  check('3 : doublon de nom REJETÉ au sein du MÊME foyer', duplicateRejected);

  // Recettes par foyer : A garde la sienne, B a la sienne
  const [recipeA] = await db
    .insert(recipes)
    .values({ title: 'Crêpes maison A', prepTime: 10, cookTime: 20, defaultServings: 4, instructions: 'Mélanger', householdId: hidA })
    .returning();
  const [recipeB] = await db
    .insert(recipes)
    .values({ title: 'Crêpes maison B', prepTime: 10, cookTime: 20, defaultServings: 4, instructions: 'Mélanger', householdId: hidB })
    .returning();
  await db.insert(recipeIngredients).values({ recipeId: recipeA.id, ingredientId: ingA.id, quantity: 500, unit: 'g', householdId: hidA });
  await db.insert(recipeIngredients).values({ recipeId: recipeB.id, ingredientId: ingB.id, quantity: 300, unit: 'g', householdId: hidB });
  await db.insert(mealPlans).values({ date: in3Days, mealType: 'Soir', recipeId: recipeA.id, servings: 4, householdId: hidA });
  await db.insert(mealPlans).values({ date: in3Days, mealType: 'Soir', recipeId: recipeB.id, servings: 4, householdId: hidB });
  check('3 : recettes créées dans les deux foyers', !!recipeA?.id && !!recipeB?.id);

  // ==========================================================================
  // 4. Isolation réelle par listages (requêtes de PRODUCTION)
  // ==========================================================================

  // 4.1 Garde-manger : le stock du foyer A ne voit pas celui de B
  upsertPantryItem({ ingredientId: ingA.id, quantity: 300, unit: 'g', expiresAt: null, householdId: hidA });
  upsertPantryItem({ ingredientId: ingB.id, quantity: 900, unit: 'g', expiresAt: null, householdId: hidB });
  const pantryA = listPantryItems(hidA);
  const pantryB = listPantryItems(hidB);
  check(
    '4 : listPantryItems(A) ne voit QUE le stock de A (stock de B exclu)',
    pantryA.some((r) => r.ingredientId === ingA.id) && !pantryA.some((r) => r.ingredientId === ingB.id),
  );
  check(
    '4 : listPantryItems(B) ne voit QUE le stock de B',
    pantryB.some((r) => r.ingredientId === ingB.id) && !pantryB.some((r) => r.ingredientId === ingA.id),
  );

  // 4.2 Liste de courses : ne génère que depuis le planning du foyer demandé
  const genA = generateShoppingRows(todayStr, in3Days, hidA);
  check(
    '4 : generateShoppingRows(A) ne planifie que les repas de A (gratin + crêpes A)',
    genA.plannedMeals === 2,
  );
  const rowsA = await db
    .select({ ingredientId: shoppingItems.ingredientId, quantity: shoppingItems.quantity })
    .from(shoppingItems)
    .where(eq(shoppingItems.householdId, hidA));
  const qtyInA = (ingredientId: string) => rowsA.find((r) => r.ingredientId === ingredientId)?.quantity ?? 0;
  check(
    '4 : liste A = farine pré-4b (500-200) et farine A (500-300), jamais la farine B',
    qtyInA(oldIngredient.id) === 300 && qtyInA(ingA.id) === 200 && !rowsA.some((r) => r.ingredientId === ingB.id),
  );

  const genB = generateShoppingRows(todayStr, in3Days, hidB);
  check(
    '4 : generateShoppingRows(B) ignore le planning de A (1 seul repas, celui de B)',
    genB.plannedMeals === 1,
  );
  const rowsBB = await db
    .select({ ingredientId: shoppingItems.ingredientId })
    .from(shoppingItems)
    .where(eq(shoppingItems.householdId, hidB));
  check(
    '4 : stock B (900 g) couvre le besoin B (300 g) → farine B absente de la liste, farine A jamais demandée pour B',
    rowsBB.length === 0 && !rowsBB.some((r) => r.ingredientId === ingA.id),
  );
  const rowsAfterB = await db
    .select({ ingredientId: shoppingItems.ingredientId })
    .from(shoppingItems)
    .where(eq(shoppingItems.householdId, hidA));
  check('4 : régénérer B ne détruit pas la liste de A', rowsAfterB.some((r) => r.ingredientId === ingA.id));

  // 4.3 Notifications (repas du jour) : la lecture est scopée au foyer
  const mealsA = await getTodayMeals(todayStr, hidA);
  const mealsB = await getTodayMeals(todayStr, hidB);
  check(
    '4 : repas du jour par foyer — la base de A ne fuit pas vers B',
    mealsA.some((m) => m.label === 'Gratin pré-4b') && mealsB.length === 0,
  );
  check('4 : repas du jour B ne voit pas le gratin de A', !mealsB.some((m) => m.label === 'Gratin pré-4b'));
  check(
    '4 : getTodayMeals(in3Days, A) voit les crêpes A, pas les crêpes B',
    (await getTodayMeals(in3Days, hidA)).some((m) => m.label === 'Crêpes maison A') &&
      !(await getTodayMeals(in3Days, hidB)).some((m) => m.label === 'Crêpes maison A'),
  );

  // 4.4 Export JSON : l'enveloppe ne contient QUE les données du foyer demandé
  const envA = await buildExportEnvelope(hidA);
  const envB = await buildExportEnvelope(hidB);
  check(
    '4 : export A contient les recettes A et JAMAIS celles de B',
    envA.data.recipes.some((r) => r.title === 'Crêpes maison A') &&
      !envA.data.recipes.some((r) => r.title === 'Crêpes maison B'),
  );
  check(
    '4 : export B ne contient ni le gratin ni les recettes de A',
    envB.data.recipes.every((r) => r.title.startsWith('Crêpes maison B')),
  );
  check(
    '4 : les ingrédients du catalogue ne traversent pas les foyers à l’export',
    !envA.data.ingredients.some((i) => i.id === ingB.id) && !envB.data.ingredients.some((i) => i.id === ingA.id),
  );

  // 4.5 Standards : un standard B n'existe pas pour le foyer A
  await db.insert(ingredientStandards).values({ ingredientId: ingA.id, quantity: 100, unit: 'g', servingsRef: 4, householdId: hidA });
  await db.insert(ingredientStandards).values({ ingredientId: ingB.id, quantity: 250, unit: 'g', servingsRef: 4, householdId: hidB });
  const standardsA = await getIngredientStandardsMap(hidA);
  const standardsB = await getIngredientStandardsMap(hidB);
  check(
    '4 : standards pré-remplissage scopés par foyer',
    standardsA[ingA.id]?.quantity === 100 && standardsB[ingB.id]?.quantity === 250 && !standardsA[ingB.id] && !standardsB[ingA.id],
  );

  // 4.6 Antidoublon F09 : la fenêtre est PAR FOYER (le plat de B ne bloque pas A)
  await db.insert(mealPlans).values({ date: iso(new Date(today.getTime() + 5 * 24 * 3600 * 1000)), mealType: 'Midi', recipeId: recipeA.id, servings: 4, householdId: hidA });
  check(
    '4 : antidoublon intra-foyer (repas A détecté dans la fenêtre)',
    (await findPlanInWindow({ recipeId: recipeA.id, date: in3Days, minDays: 7, householdId: hidA })) !== null,
  );
  check(
    '4 : le même plat chez B ne bloque PAS la fenêtre de A',
    (await findPlanInWindow({ recipeId: recipeA.id, date: in3Days, minDays: 7, householdId: hidB })) === null,
  );

  // 4.7 Suggestions : uniquement les recettes du foyer
  const suggestionsA = await findSuggestableRecipes({ date: todayStr, minDays: 0, householdId: hidA });
  const suggestionsB = await findSuggestableRecipes({ date: todayStr, minDays: 0, householdId: hidB });
  check(
    '4 : suggestions scopées par foyer',
    suggestionsA.some((r) => r.id === recipeA.id) && !suggestionsA.some((r) => r.id === recipeB.id) &&
      suggestionsB.some((r) => r.id === recipeB.id) && !suggestionsB.some((r) => r.id === recipeA.id),
  );

  // 4.8 Feedback : création scopée + le foyer B ne peut pas trier le retour de A
  const feedbackA = await createFeedback({ userId: userB.id, category: 'bug', message: 'Retour du test multi-tenant', householdId: hidA });
  check('4 : retour créé dans le foyer A', !!feedbackA?.id);
  check('4 : le foyer B ne peut PAS changer le statut d’un retour de A', (await updateFeedbackStatus(feedbackA.id, 'traite', hidB)) === false);
  check('4 : le foyer A peut trier son retour', (await updateFeedbackStatus(feedbackA.id, 'traite', hidA)) === true);

  // ==========================================================================
  // 5. Jeton de partage ciblé (contrat §3.4) : jeton A ne sert JAMAIS B
  // ==========================================================================
  const recordA = await validateAccessToken(clearTokenA, ['calendar_read', 'api']);
  check('5 : jeton pré-4b validé et raccroché AU foyer principal', recordA !== null && recordA.householdId === hidA);

  const clearTokenB = 'tok-multi-tenant-b';
  await db.insert(accessTokens).values({
    token: `sha256:${createHash('sha256').update(clearTokenB).digest('hex')}`,
    createdByUserId: userB.id,
    type: 'api',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    householdId: hidB,
  });
  const recordB = await validateAccessToken(clearTokenB, ['api', 'calendar_read']);
  check('5 : jeton du foyer B validé, foyer B', recordB !== null && recordB.householdId === hidB);
  check('5 : les jetons des deux foyers portent des foyers distincts', recordA!.householdId !== recordB!.householdId);

  // La page publique / l'ICS / le JSON servent le planning DU foyer du jeton :
  // même requête que app/public/calendar (getTodayMeals est le lecteur partagé
  // du planning — ici sur la fenêtre du jeton, la donnée de B reste hors A)
  const servedForTokenA = await getTodayMeals(todayStr, recordA!.householdId!);
  const servedForTokenB = await getTodayMeals(in3Days, recordB!.householdId!);
  check(
    '5 : le jeton de A ne sert QUE le planning de A (aucun repas de B)',
    servedForTokenA.some((m) => m.label === 'Gratin pré-4b') && !servedForTokenA.some((m) => m.label === 'Crêpes maison B'),
  );
  check(
    '5 : le jeton de B ne voit JAMAIS le planning de A',
    servedForTokenB.some((m) => m.label === 'Crêpes maison B') && !servedForTokenB.some((m) => m.label === 'Gratin pré-4b'),
  );

  // ==========================================================================
  // 6. MULTI_HOUSEHOLDS (contrat §1.4) — OFF par défaut, valeurs acceptées
  // ==========================================================================
  delete process.env.MULTI_HOUSEHOLDS;
  check('6 : MULTI_HOUSEHOLDS absent → OFF (comportement inchangé)', multiHouseholdsEnabled() === false);
  process.env.MULTI_HOUSEHOLDS = 'false';
  check('6 : MULTI_HOUSEHOLDS=false → OFF', multiHouseholdsEnabled() === false);
  process.env.MULTI_HOUSEHOLDS = '1';
  check('6 : MULTI_HOUSEHOLDS=1 → ON', multiHouseholdsEnabled() === true);
  process.env.MULTI_HOUSEHOLDS = 'true';
  check('6 : MULTI_HOUSEHOLDS=true → ON', multiHouseholdsEnabled() === true);
  process.env.MULTI_HOUSEHOLDS = 'nimporte';
  check('6 : valeur inconnue → OFF (défaut sûr)', multiHouseholdsEnabled() === false);
  delete process.env.MULTI_HOUSEHOLDS;

  // En mode ON, chaque inscription crée un foyer distinct : createHousehold
  // est le chemin exact de registerUser (app/actions/auth.ts C-062)
  const hidC = createHousehold('Foyer de inscrite@test.local');
  check('6 : mode ON — un nouveau foyer par inscription', hidC !== hidA && hidC !== hidB);

  // ==========================================================================
  // 7. Billetterie du pantry UNIQUE conservée (décision C-062) : une seule
  //    ligne de stock par ingrédient, quel que soit le foyer
  // ==========================================================================
  upsertPantryItem({ ingredientId: ingA.id, quantity: 400, unit: 'g', expiresAt: null, householdId: hidA });
  const stockARows = await db.select().from(pantryItems).where(eq(pantryItems.householdId, hidA));
  const farineAStock = stockARows.filter((r) => r.ingredientId === ingA.id);
  check('7 : garde-manger — ligne unique par ingrédient au sein du foyer (C-062)', farineAStock.length === 1 && farineAStock[0].quantity === 400);

  console.log(`\n${passed} tests PASS`);
  // Meilleur effort : la base jetable peut rester ouverte sous Windows (EPERM)
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* pas bloquant, dossier temp */
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('FAIL exception', e);
  process.exit(1);
});
