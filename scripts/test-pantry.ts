import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Test runtime F11 (garde-manger), vague 4 — scénarios P1 à P5 du plan de
// test. Base jetable SQLITE_PATH + db-ensure (pattern test-import-recipe).
// Le test exécute les requêtes de production via les modules partagés
// app/pantry/queries.ts et app/shopping-list/queries.ts, ET l'action
// réelle app/actions/pantry.ts (leçons C-047 / C-055) — jamais une réplique.

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mealplan-pantry-'));
const dbPath = path.join(tmpDir, 'pantry.db');
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
    ingredients,
    recipes,
    recipeIngredients,
    mealPlans,
    shoppingItems,
    pantryItems,
  } = await import('../lib/db/schema');
  const { eq } = await import('drizzle-orm');
  const Argon2 = (await import('@node-rs/argon2')).default;
  const { pantryItemInput } = await import('../lib/validators/pantry');
  const {
    upsertPantryItem,
    deletePantryItemById,
    findIngredientById,
    fetchPantryStock,
    deductPantryStock,
    listPantryItems,
  } = await import('../app/pantry/queries');
  const { generateShoppingRows } = await import('../app/shopping-list/queries');
  const { savePantryItem, removePantryItem } = await import('../app/actions/pantry');

  // =========================================================================
  // Données de base : compte + catalogue + recettes + planning
  // =========================================================================
  const hash = await Argon2.hash('x');
  const [user] = await db
    .insert(users)
    .values({ email: 'pantry@test.local', password: hash, role: 'MEMBER' })
    .returning();
  void user;

  const [farine] = await db
    .insert(ingredients)
    .values({ name: 'Farine', category: 'Épicerie', defaultUnit: 'g' })
    .returning();
  const [sucre] = await db
    .insert(ingredients)
    .values({ name: 'Sucre', category: 'Épicerie', defaultUnit: 'g' })
    .returning();
  const [beurre] = await db
    .insert(ingredients)
    .values({ name: 'Beurre', category: 'Frais', defaultUnit: 'g' })
    .returning();
  const [oeufs] = await db
    .insert(ingredients)
    .values({ name: 'Œufs', category: 'Frais', defaultUnit: 'pièce' })
    .returning();
  check('catalogue créé', !!farine?.id && !!sucre?.id && !!beurre?.id && !!oeufs?.id);

  const today = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = iso(today);
  const tomorrowStr = iso(new Date(today.getTime() + 24 * 3600 * 1000));

  // =========================================================================
  // P1 — CRUD stock (quantité décimale, unité éditée, ligne unique)
  // =========================================================================
  check('findIngredientById retrouve la farine', findIngredientById(farine.id)?.name === 'Farine');

  // Même code que l'action : envoi du formulaire réel vers savePantryItem ?
  // Pas de contexte de requête ici (NextAuth) : on exécute d'abord les
  // helpers de production, puis l'action réelle en P5 pour la garde.
  upsertPantryItem({ ingredientId: farine.id, quantity: 200, unit: 'g', expiresAt: null });
  const [row1] = await db.select().from(pantryItems).where(eq(pantryItems.ingredientId, farine.id));
  check('P1 : 200 g de farine enregistrés en base', row1?.quantity === 200 && row1?.unit === 'g');

  // Décimale acceptée (0,5 pièce — réel SQLite)
  upsertPantryItem({ ingredientId: oeufs.id, quantity: 0.5, unit: 'pièce', expiresAt: null });
  const [row2] = await db.select().from(pantryItems).where(eq(pantryItems.ingredientId, oeufs.id));
  check('P1 : quantité décimale 0,5 acceptée et relevee en base', row2?.quantity === 0.5);

  // Réenregistrer le même ingrédient = mise à jour (contrainte unique),
  // pas une deuxième ligne : unité éditée en même temps
  upsertPantryItem({ ingredientId: farine.id, quantity: 250, unit: 'kg', expiresAt: tomorrowStr });
  const farineRows = await db.select().from(pantryItems).where(eq(pantryItems.ingredientId, farine.id));
  check('P1 : ligne unique par ingrédient (upsert, pas de doublon)', farineRows.length === 1);
  check('P1 : unité éditée sur la même ligne', farineRows[0]?.unit === 'kg' && farineRows[0]?.quantity === 250);
  check('P1 : péremption enregistrée', farineRows[0]?.expiresAt === tomorrowStr);

  // La contrainte unique est bien en base : un INSERT direct (hors upsert)
  // est rejeté par SQLite
  let uniqueRejected = false;
  try {
    await db.insert(pantryItems).values({ ingredientId: farine.id, quantity: 1, unit: 'g' });
  } catch (e) {
    uniqueRejected = /UNIQUE/i.test(String(e));
  }
  check('P1 : contrainte UNIQUE ingredient_id enforcee par SQLite', uniqueRejected);

  // Retour à 200 g de farine pour la suite
  upsertPantryItem({ ingredientId: farine.id, quantity: 200, unit: 'g', expiresAt: null });

  // =========================================================================
  // P2 — Péremption : validation Zod de la date (l'alerte visuelle sur
  // date passée est calculée côté page : expiresAt <= aujourd'hui)
  // =========================================================================
  const badDate = pantryItemInput.safeParse({
    ingredientId: sucre.id,
    quantity: '1',
    unit: 'g',
    expiresAt: '31/12/2026',
  });
  check('P2 : date non ISO refusée par Zod', !badDate.success);

  const noDate = pantryItemInput.safeParse({ ingredientId: sucre.id, quantity: '1', unit: 'g', expiresAt: '' });
  check('P2 : champ péremption vide accepté (optionnel)', noDate.success && noDate.data?.expiresAt === null);

  const pastOk = pantryItemInput.safeParse({
    ingredientId: farine.id,
    quantity: '200',
    unit: 'g',
    expiresAt: '2020-01-01',
  });
  check('P2 : date passée enregistrable (produit déjà périmé saisissable)', pastOk.success);

  const zeroQty = pantryItemInput.safeParse({ ingredientId: farine.id, quantity: '0', unit: 'g' });
  check('P1 : quantité 0 refusée par Zod', !zeroQty.success);

  // Suppression d'une ligne : helper de production + relevé en base
  upsertPantryItem({ ingredientId: sucre.id, quantity: 100, unit: 'g', expiresAt: null });
  const [sucreRow] = await db.select().from(pantryItems).where(eq(pantryItems.ingredientId, sucre.id));
  const changes = deletePantryItemById(sucreRow.id);
  const sucreAfter = await db.select().from(pantryItems).where(eq(pantryItems.ingredientId, sucre.id));
  check('P1 : suppression effective (changes > 0, ligne disparue)', changes > 0 && sucreAfter.length === 0);
  check('P1 : suppression inexistante = 0 changement', deletePantryItemById('inexistant') === 0);

  // =========================================================================
  // P3 — Exclusion courses : le stock déduit le besoin
  // =========================================================================

  // Recette Crêpes : 500 g de farine, 10 g de sucre, 100 g de beurre
  const [crepes] = await db
    .insert(recipes)
    .values({ title: 'Crêpes', prepTime: 10, cookTime: 20, defaultServings: 4, instructions: 'Mélanger et cuire', created_by: user.id })
    .returning();
  await db.insert(recipeIngredients).values({ recipeId: crepes.id, ingredientId: farine.id, quantity: 500, unit: 'g' });
  await db.insert(recipeIngredients).values({ recipeId: crepes.id, ingredientId: sucre.id, quantity: 10, unit: 'g' });
  await db.insert(recipeIngredients).values({ recipeId: crepes.id, ingredientId: beurre.id, quantity: 100, unit: 'g' });

  await db.insert(mealPlans).values({ date: todayStr, mealType: 'Soir', recipeId: crepes.id, servings: 4 });

  // Stock au moment de la génération : 200 g de farine (couvert
  // partiellement), 200 g de beurre (couvre tout), pas de sucre
  upsertPantryItem({ ingredientId: beurre.id, quantity: 200, unit: 'g', expiresAt: null });
  check('P3 : stock releve par fetchPantryStock', fetchPantryStock().length === 3);

  const gen1 = generateShoppingRows(todayStr, todayStr);
  const genRows = await db
    .select({ ingredientId: shoppingItems.ingredientId, quantity: shoppingItems.quantity, unit: shoppingItems.unit })
    .from(shoppingItems)
    .where(eq(shoppingItems.addedManually, false));
  const qtyOf = (id: string | null) => genRows.find((r) => r.ingredientId === id)?.quantity ?? 0;

  check('P3 : farine 500 g demandés, 200 g en stock -> 300 g en liste', qtyOf(farine.id) === 300);
  check('P3 : sucre sans stock -> quantité entière demandée', qtyOf(sucre.id) === 10);
  check('P3 : beurre 100 g requis dont 200 g en stock -> article exclu', !genRows.some((r) => r.ingredientId === beurre.id));
  check('P3 : compteurs de déduction/exclusion cohérents', gen1.deducted === 1 && gen1.excluded === 1 && gen1.rowCount === 2);

  // =========================================================================
  // P4 — Recalcul exact après modification du stock / des plans (aucun cache)
  // =========================================================================

  // Un article coché acheté reste coché après régénération (comportement
  // conservé — regression non-régression) et une ligne manuelle survit
  const [farineItem] = await db.select().from(shoppingItems).where(eq(shoppingItems.ingredientId, farine.id));
  await db.update(shoppingItems).set({ isBought: true }).where(eq(shoppingItems.id, farineItem.id));
  await db.insert(shoppingItems).values({ manualName: 'Épongé', quantity: 1, unit: 'pièce', isBought: false, addedManually: true });
  const [gaufres] = await db
    .insert(recipes)
    .values({ title: 'Gaufres', prepTime: 10, cookTime: 15, defaultServings: 4, instructions: 'Cuire', created_by: user.id })
    .returning();
  await db.insert(recipeIngredients).values({ recipeId: gaufres.id, ingredientId: farine.id, quantity: 200, unit: 'g' });
  await db.insert(mealPlans).values({ date: todayStr, mealType: 'Midi', recipeId: gaufres.id, servings: 4 });

  // Deux recettes cumulées : (500 + 200) - 200 = 500 g de farine
  const gen2 = generateShoppingRows(todayStr, todayStr);
  const rows2 = await db
    .select({ ingredientId: shoppingItems.ingredientId, quantity: shoppingItems.quantity, bought: shoppingItems.isBought, addedManually: shoppingItems.addedManually })
    .from(shoppingItems);
  const farine2 = rows2.find((r) => r.ingredientId === farine.id);
  check('P3 : deux recettes cumulées -> (500+200)-200 = 500 g de farine', farine2?.quantity === 500);
  check('P4 : la coche « acheté » survit à la régénération', rows2.some((r) => r.ingredientId === farine.id && r.bought === true && r.addedManually === false));
  check('P4 : les articles manuels survivent à la régénération', rows2.some((r) => r.addedManually === true));

  // Changement de stock : farine portée à 700 g -> besoin (700) entièrement
  // couvert -> farine absente de la nouvelle liste sans autre changement
  upsertPantryItem({ ingredientId: farine.id, quantity: 700, unit: 'g', expiresAt: null });
  const gen3 = generateShoppingRows(todayStr, todayStr);
  const rows3 = await db
    .select({ ingredientId: shoppingItems.ingredientId })
    .from(shoppingItems)
    .where(eq(shoppingItems.addedManually, false));
  check('P4 : stock fraîchement modifié -> recalcul exact (farine exclue)', !rows3.some((r) => r.ingredientId === farine.id));
  check('P4 : le sucre reste demandé après régénération', rows3.some((r) => r.ingredientId === sucre.id));
  check('P4 : exclusion comptée dans le résultat de génération', gen3.excluded === 2 && gen3.rowCount === 1);

  // =========================================================================
  // P5 — Permissions : l'action réelle refuse sans session (requireSession)
  // =========================================================================

  // Exécution de l'action réelle hors contexte NextAuth : requireSession
  // lève, l'action attrape et refuse proprement (rien n'est écrit)
  const formData = new FormData();
  formData.set('ingredientId', sucre.id);
  formData.set('quantity', '1');
  formData.set('unit', 'g');
  formData.set('expiresAt', '');
  const withoutSession = await savePantryItem(null, formData);
  check('P5 : savePantryItem refusée sans session connectée', withoutSession !== null && withoutSession.success === false);
  const sucreRows = await db.select().from(pantryItems).where(eq(pantryItems.ingredientId, sucre.id));
  check('P5 : aucun stock écrit malgré le refus (garde avant l\u2019écriture)', sucreRows.length === 0);

  const removeGuest = await removePantryItem('inexistant');
  check('P5 : removePantryItem refusée sans session connectée', removeGuest.success === false);

  // Rappel périmètre P5 : le refus GUEST est porté par requireSession
  // (garde partagée, déjà en exécution dans toutes les actions — cf.
  // lib/auth-guards.ts) ; le parcours GUEST complet (403 en session réelle)
  // est revalidé par le chef de projet au runtime HTTP (gate 7 du plan).

  // Nettoyage : la détection « périmé » de la page repose sur expiresAt
  // comparé au jour local — la ligne suivante prouve la lecture en base
  const listing = listPantryItems();
  check('listPantryItems joint le catalogue (noms présents)', listing.some((r) => r.name === 'Farine'));

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
