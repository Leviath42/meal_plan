import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Test runtime F18 (W5, scénarios E1→E5 du plan de test vague 4) :
//  - E1 export complet : enveloppe versionnée horodatée, aucune donnée
//    secrète (mots de passe, sessions, jetons, licences Stripe) ;
//  - E2 export → import sur base VIERGE (autre processus, autre base jetable)
//    → mêmes contenus (liaisons/planning/stock joints par nom pour comparer) ;
//  - E3 atomicité : fichier invalide (ingrédient corrompu en 12e position)
//    puis échec SQL AU MILIEU de la transaction (contrainte slot unique) :
//    dans les deux cas, comptage intégral avant/après → RIEN d'écrit ;
//  - E4 doublons : import du même fichier sur base déjà peuplée → titres
//    suffixés « (2) », catalogue d'ingrédients non dupliqué, rien écrasé ;
//  - E5 essai expiré : import REFUSÉ, export TOUJOURS possible.
//
// L'import sur une autre base nécessite un second processus : SQLITE_PATH est
// figé à l'ouverture de lib/db. Le script se réinvoque donc en mode enfant
// (« --child import ») qui rend un compte-rendu JSON sur la dernière ligne.

process.env.TZ = 'Europe/Paris';

let passed = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  passed++;
  console.log(`PASS ${name}`);
}

interface ImportResultLike {
  success: boolean;
  message: string;
  counts?: Record<string, number>;
}

interface ChildRows {
  recipes: Array<{
    title: string; description: string | null; prepTime: number; cookTime: number;
    defaultServings: number; mealCourse: string | null; instructions: string;
    tags: string | null; source: string | null; created_by: string | null; lastServedAt: string | null;
  }>;
  ingredients: Array<{ name: string; category: string; defaultUnit: string }>;
  links: Array<{ recipeTitle: string; ingredientName: string; quantity: number; unit: string; note: string | null }>;
  meal_plans: Array<{
    date: string; mealType: string; customNote: string | null; servings: number | null;
    mealCourse: string | null; recipeTitle: string | null;
  }>;
  pantry: Array<{ ingredientName: string; quantity: number; unit: string; expiresAt: string | null }>;
  app_settings: { defaultServings: number; theme: string } | null;
}

interface ChildOut {
  result: ImportResultLike | null;
  exportOk: boolean;
  rows: ChildRows;
}

function sqliteTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// ---------------------------------------------------------------------------
// Mode enfant : import sur SA base jetable puis dump ligne par ligne.
// ---------------------------------------------------------------------------
async function childImport(dbPath: string, payloadPath: string | null, ageDays: number): Promise<void> {
  execFileSync('npx', ['tsx', 'scripts/db-ensure.ts', path.join(process.cwd(), 'drizzle'), dbPath], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  const { db } = await import('../lib/db');
  const { users, recipes, ingredients, recipeIngredients, mealPlans, pantryItems, appSettings } =
    await import('../lib/db/schema');
  const { eq } = await import('drizzle-orm');
  const Argon2 = (await import('@node-rs/argon2')).default;

  // Compte ADMIN : premier compte = début de l'essai (âge pilotable pour E5)
  const createdAt = sqliteTimestamp(new Date(Date.now() - ageDays * 86_400_000 - 3_600_000));
  await db.insert(users).values({
    email: `admin-w5-${ageDays}@test.local`,
    password: await Argon2.hash('x'),
    role: 'ADMIN',
    createdAt,
  });

  let result: ImportResultLike | null = null;
  if (payloadPath) {
    const { importExportData } = await import('../lib/import');
    result = await importExportData(JSON.parse(fs.readFileSync(payloadPath, 'utf8')));
  }

  // L'export doit marcher dans TOUS les cas (lecture, jamais bloquée)
  const { buildExportEnvelope, EXPORT_FORMAT } = await import('../lib/export');
  const envelope = await buildExportEnvelope();
  const exportOk = envelope.format === EXPORT_FORMAT && envelope.version === 1;

  // Dump joint : les identifiants ont été remappés à l'import, on compare
  // donc par TITRE de recette et NOM d'ingrédient, pas par id.
  const [recipeRows, ingredientRows, linkRows, mealRows, pantryRows, settingsRows] = await Promise.all([
    db.select({
      title: recipes.title, description: recipes.description, prepTime: recipes.prepTime,
      cookTime: recipes.cookTime, defaultServings: recipes.defaultServings, mealCourse: recipes.mealCourse,
      instructions: recipes.instructions, tags: recipes.tags, source: recipes.source,
      created_by: recipes.created_by, lastServedAt: recipes.lastServedAt,
    }).from(recipes),
    db.select({
      name: ingredients.name, category: ingredients.category, defaultUnit: ingredients.defaultUnit,
    }).from(ingredients),
    db.select({
      recipeTitle: recipes.title, ingredientName: ingredients.name,
      quantity: recipeIngredients.quantity, unit: recipeIngredients.unit, note: recipeIngredients.note,
    }).from(recipeIngredients)
      .innerJoin(recipes, eq(recipeIngredients.recipeId, recipes.id))
      .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id)),
    db.select({
      date: mealPlans.date, mealType: mealPlans.mealType, customNote: mealPlans.customNote,
      servings: mealPlans.servings, mealCourse: mealPlans.mealCourse, recipeTitle: recipes.title,
    }).from(mealPlans).leftJoin(recipes, eq(mealPlans.recipeId, recipes.id)),
    db.select({
      ingredientName: ingredients.name, quantity: pantryItems.quantity,
      unit: pantryItems.unit, expiresAt: pantryItems.expiresAt,
    }).from(pantryItems).innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id)),
    db.select({ defaultServings: appSettings.defaultServings, theme: appSettings.theme })
      .from(appSettings).limit(1),
  ]);

  const rows: ChildRows = {
    recipes: recipeRows,
    ingredients: ingredientRows,
    links: linkRows,
    meal_plans: mealRows,
    pantry: pantryRows,
    app_settings: settingsRows[0] ?? null,
  };

  console.log('CHILD_JSON ' + JSON.stringify({ result, exportOk, rows }));
  process.exit(0);
}

// Invocation d'un enfant « --child import » sur une base jetable dédiée.
function runChild(dbPath: string, payloadPath: string | null, ageDays: number): ChildOut {
  const out = execFileSync('npx', [
    'tsx', 'scripts/test-export.ts', '--child', 'import', dbPath,
    ...(payloadPath ? [payloadPath] : ['-']),
    String(ageDays),
  ], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, SQLITE_PATH: dbPath, TZ: 'Europe/Paris' },
    cwd: process.cwd(),
  });
  const line = out.split(/\r?\n/).filter((l) => l.startsWith('CHILD_JSON ')).pop();
  if (!line) throw new Error('enfant sans compte-rendu CHILD_JSON');
  return JSON.parse(line.slice('CHILD_JSON '.length)) as ChildOut;
}

function sortKeys(items: string[]): string[] {
  return [...items].sort();
}

// ---------------------------------------------------------------------------
// Test principal
// ---------------------------------------------------------------------------
async function main() {
  // Mode enfant (réinvocation) : tout en haut, avant d'ouvrir la base locale
  if (process.argv[2] === '--child') {
    const payloadPath = process.argv[5] && process.argv[5] !== '-' ? process.argv[5] : null;
    await childImport(process.argv[4]!, payloadPath, Number(process.argv[6] ?? 0));
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mealplan-w5-'));
  const dbMain = path.join(tmpDir, 'base-source.db');
  process.env.SQLITE_PATH = dbMain;

  execFileSync('npx', ['tsx', 'scripts/db-ensure.ts', path.join(process.cwd(), 'drizzle'), dbMain], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  const { db } = await import('../lib/db');
  const {
    users, recipes, ingredients, recipeIngredients, mealPlans, pantryItems,
    appSettings, accessTokens, sessions, licenses,
  } = await import('../lib/db/schema');
  const { eq } = await import('drizzle-orm');
  const Argon2 = (await import('@node-rs/argon2')).default;
  const { buildExportEnvelope, EXPORT_FORMAT, EXPORT_VERSION } = await import('../lib/export');
  const { importExportData } = await import('../lib/import');

  // --- population de la base source ---------------------------------------
  const [admin] = await db.insert(users).values({
    email: 'admin@famille.test', password: await Argon2.hash('secret-du-foyer'),
    role: 'ADMIN', createdAt: sqliteTimestamp(new Date(Date.now() - 3_600_000)),
  }).returning({ id: users.id });

  // 15 ingrédients (dont au moins 12 pour le scénario E3 « 12e position »)
  const ingredientIds: string[] = [];
  const seedIngredients = [
    { name: 'Farine T55', category: 'Épicerie', defaultUnit: 'g' },
    { name: 'Sucre vanillé', category: 'Épicerie', defaultUnit: 'g' },
    { name: 'Pommes', category: 'Fruits & Légumes', defaultUnit: 'pièce' },
  ];
  for (let n = 4; n <= 15; n++) {
    seedIngredients.push({ name: `Ingrédient de test ${n}`, category: 'Divers', defaultUnit: 'pièce' });
  }
  for (const ing of seedIngredients) {
    const [row] = await db.insert(ingredients).values(ing).returning({ id: ingredients.id });
    ingredientIds.push(row.id);
  }
  const [farineId, sucreId, pommesId] = ingredientIds;

  // 2 recettes, dont une planifiée une fois
  const [tarte] = await db.insert(recipes).values({
    title: 'Tarte test export', description: 'La recette du dimanche',
    prepTime: 20, cookTime: 45, defaultServings: 6, mealCourse: 'dessert',
    instructions: 'Éplucher les pommes.\nCuire 45 min.', tags: 'dessert, test',
    source: 'http://exemple.test/tarte', created_by: 'admin@famille.test', lastServedAt: '2026-11-01',
  }).returning({ id: recipes.id });
  await db.insert(recipes).values({
    title: 'Salade test export', prepTime: 10, cookTime: 0, defaultServings: 4,
    instructions: 'Laver. Servir.',
  });

  await db.insert(recipeIngredients).values([
    { recipeId: tarte.id, ingredientId: farineId, quantity: 200, unit: 'g' },
    { recipeId: tarte.id, ingredientId: sucreId, quantity: 100, unit: 'g', note: 'vanillé' },
    { recipeId: tarte.id, ingredientId: pommesId, quantity: 6, unit: 'pièce' },
  ]);

  await db.insert(mealPlans).values([
    { date: '2026-11-10', mealType: 'lunch', servings: 5, mealCourse: 'dessert', recipeId: tarte.id, createdAt: sqliteTimestamp(new Date()), updatedAt: sqliteTimestamp(new Date()) },
    { date: '2026-11-12', mealType: 'dinner', customNote: 'Restes du dimanche', servings: null, mealCourse: null, createdAt: sqliteTimestamp(new Date()), updatedAt: sqliteTimestamp(new Date()) },
  ]);

  await db.insert(pantryItems).values({ ingredientId: farineId, quantity: 250, unit: 'g', expiresAt: '2026-12-31' });

  await db.insert(appSettings).values({ id: 1, defaultServings: 5, theme: 'rose' }).onConflictDoNothing();

  // Données secrètes qui ne doivent JAMAIS sortir dans l'export
  await db.insert(licenses).values({
    licenseKey: 'sha256:' + 'a'.repeat(64), status: 'active',
    stripeSessionId: 'cs_secret_w5_excluded', stripeCustomerId: 'cus_secret_w5',
  });
  await db.insert(sessions).values({
    sessionToken: 'sess_secret_w5_excluded', userId: admin.id, expires: '2027-01-01T00:00:00.000Z',
  });
  await db.insert(accessTokens).values({
    token: 'tok_secret_w5_excluded', type: 'calendar_read', expiresAt: '2027-01-01T00:00:00.000Z',
  });

  // --- E1 : export complet, sans secrets -----------------------------------
  const env = await buildExportEnvelope();
  check('E1 : format et version de l\'enveloppe', env.format === EXPORT_FORMAT && env.version === EXPORT_VERSION);
  check('E1 : horodatage ISO présent', /^\d{4}-\d{2}-\d{2}T/.test(env.exported_at));
  check(
    'E1 : sections attendues, exclusivement',
    sortKeys(Object.keys(env.data).map((k) => k)).join() ===
      sortKeys(['recipes', 'ingredients', 'recipe_ingredients', 'meal_plans', 'pantry_items', 'app_settings']).join()
  );
  const d1 = env.data;
  check('E1 : 2 recettes exportées', d1.recipes.length === 2);
  check('E1 : 15 ingrédients exportés', d1.ingredients.length === 15);
  check('E1 : 3 liaisons recette-ingrédient exportées', d1.recipe_ingredients.length === 3);
  check('E1 : 2 repas planifiés exportés', d1.meal_plans.length === 2);
  check('E1 : 1 article de garde-manger exporté', d1.pantry_items.length === 1);
  check(
    'E1 : paramètres exportés (5 couverts, palette rose)',
    d1.app_settings !== null && d1.app_settings.defaultServings === 5 && d1.app_settings.theme === 'rose'
  );

  const dump = JSON.stringify(env);
  check('E1 : aucun mot de passe dans l\'export', !dump.includes('password') && !dump.includes('secret-du-foyer'));
  check('E1 : aucune session ni jeton de partage', !dump.includes('sess_secret_w5_excluded') && !dump.includes('tok_secret_w5_excluded') && !dump.includes('sessionToken'));
  check('E1 : aucune donnée de licence/Stripe', !dump.includes('license') && !dump.includes('stripe') && !dump.includes('cs_secret_w5_excluded'));
  const tarteExport = d1.recipes.find((r) => r.title === 'Tarte test export');
  check(
    'E1 : champs de recette complets (temps, couverts, type de plat, étapes)',
    !!tarteExport && tarteExport.prepTime === 20 && tarteExport.cookTime === 45 &&
      tarteExport.defaultServings === 6 && tarteExport.mealCourse === 'dessert' &&
      tarteExport.instructions.includes('Éplucher') && tarteExport.lastServedAt === '2026-11-01'
  );

  const payloadPath = path.join(tmpDir, 'e1.json');
  fs.writeFileSync(payloadPath, dump);

  // Cartes id → titre / nom pour les comparaisons par contenu
  const titleById = new Map(d1.recipes.map((r) => [r.id, r.title]));
  const nameById = new Map(d1.ingredients.map((i) => [i.id, i.name]));

  // --- E2 : import sur base VIERGE (processus enfant, base séparée) --------
  const e2 = runChild(path.join(tmpDir, 'base-vierge.db'), payloadPath, 0);
  check('E2 : import réussi sur base vierge', e2.result?.success === true);
  const r2 = e2.rows;
  check('E2 : mêmes nombres de recettes/ingrédients/liaisons/repas/stock',
    r2.recipes.length === 2 && r2.ingredients.length === 15 && r2.links.length === 3 &&
    r2.meal_plans.length === 2 && r2.pantry.length === 1 &&
    e2.result?.counts?.recipes === 2 && e2.result?.counts?.meal_plans === 2
  );
  check('E2 : contenus de recettes identiques',
    d1.recipes.every((src) => {
      const copy = r2.recipes.find((c) => c.title === src.title);
      return !!copy && copy.prepTime === src.prepTime && copy.cookTime === src.cookTime &&
        copy.defaultServings === src.defaultServings && copy.mealCourse === src.mealCourse &&
        copy.instructions === src.instructions && copy.tags === src.tags &&
        copy.source === src.source && copy.description === src.description;
    })
  );
  check('E2 : liaisons recette-ingrédient identiques (par titre et nom)',
    sortKeys(r2.links.map((l) => `${l.recipeTitle}|${l.ingredientName}|${l.quantity}|${l.unit}|${l.note}`)).join() ===
      sortKeys(d1.recipe_ingredients.map((l) => `${titleById.get(l.recipeId)}|${nameById.get(l.ingredientId)}|${l.quantity}|${l.unit}|${l.note}`)).join()
  );
  check('E2 : planning identique au jour près (dates, types, couverts)',
    sortKeys(r2.meal_plans.map((m) => `${m.date}|${m.mealType}|${m.customNote}|${m.servings}|${m.mealCourse}|${m.recipeTitle ?? ''}`)).join() ===
      sortKeys(d1.meal_plans.map((m) => `${m.date}|${m.mealType}|${m.customNote}|${m.servings}|${m.mealCourse}|${m.recipeId ? titleById.get(m.recipeId) ?? '' : ''}`)).join()
  );
  check('E2 : garde-manger identique (' + 'Farine T55' + ')',
    r2.pantry.length === 1 && r2.pantry[0].ingredientName === 'Farine T55' &&
      r2.pantry[0].quantity === 250 && r2.pantry[0].unit === 'g' && r2.pantry[0].expiresAt === '2026-12-31'
  );
  check('E2 : paramètres restaurés', r2.app_settings !== null && r2.app_settings.defaultServings === 5 && r2.app_settings.theme === 'rose');

  // --- E3a : fichier corrompu (ingrédient invalide en 12e position) --------
  const corrupted = JSON.parse(dump) as typeof env;
  (corrupted.data.ingredients[11] as unknown as { defaultUnit: unknown }).defaultUnit = 12345; // nombre au lieu de texte
  const corruptPath = path.join(tmpDir, 'corrompu.json');
  fs.writeFileSync(corruptPath, JSON.stringify(corrupted));

  const e3a = runChild(path.join(tmpDir, 'base-corrompue.db'), corruptPath, 0);
  check('E3 : fichier corrompu refusé', e3a.result?.success === false && /ingr[ié]dient/i.test(e3a.result?.message ?? ''));
  const r3a = e3a.rows;
  check('E3 : base VIERGE après refus (comptage complet avant/après)',
    r3a.recipes.length === 0 && r3a.ingredients.length === 0 && r3a.links.length === 0 &&
    r3a.meal_plans.length === 0 && r3a.pantry.length === 0 && r3a.app_settings === null
  );

  // --- E3b : échec SQL AU MILIEU de la transaction (contrainte slot unique) -
  // Fichier valide en Zod mais deux repas identiques (date+type+recette) :
  // la recette et ses liaisons sont inscrites PUIS le 2e repas viole la
  // contrainte UNIQUE meal_plans_slot_unique → rollback intégral attendu.
  const midtx = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    data: {
      recipes: [{
        id: 'r-rollback', title: 'Rollback test export', description: null, prepTime: 5, cookTime: 5,
        defaultServings: 2, mealCourse: null, instructions: 'Doit disparaitre.',
        tags: null, source: null, created_by: null, lastServedAt: null,
      }],
      ingredients: [{ id: 'i-rollback', name: 'Sel de rollback', category: 'Épicerie', defaultUnit: 'g' }],
      recipe_ingredients: [{ recipeId: 'r-rollback', ingredientId: 'i-rollback', quantity: 1, unit: 'pincée', note: null }],
      meal_plans: [
        { date: '2026-11-20', mealType: 'dinner', customNote: null, servings: 2, mealCourse: null, recipeId: 'r-rollback' },
        { date: '2026-11-20', mealType: 'dinner', customNote: null, servings: 2, mealCourse: null, recipeId: 'r-rollback' },
      ],
      pantry_items: [],
      app_settings: null,
    },
  };
  const midtxPath = path.join(tmpDir, 'midtx.json');
  fs.writeFileSync(midtxPath, JSON.stringify(midtx));

  const e3b = runChild(path.join(tmpDir, 'base-midtx.db'), midtxPath, 0);
  check('E3 : échec au milieu → import échoué proprement', e3b.result?.success === false && /annul[eé]/i.test(e3b.result?.message ?? ''));
  const r3b = e3b.rows;
  check('E3 : RIEN écrit après rollback (recette/liaison/repas/ingrédient)',
    r3b.recipes.length === 0 && r3b.ingredients.length === 0 && r3b.links.length === 0 &&
    r3b.meal_plans.length === 0 && r3b.pantry.length === 0
  );

  // --- E4 : import sur base déjà peuplée (processus principal, base source) -
  const before = (await db.select().from(recipes)).length;
  const res4 = await importExportData(JSON.parse(dump) as unknown);
  check('E4 : import réussi sur base déjà peuplée', res4.success === true);
  const afterRecipes = await db.select({ title: recipes.title, instructions: recipes.instructions }).from(recipes);
  check('E4 : aucun écrasement — titres doublons suffixés « (2) »',
    afterRecipes.length === before + 2 &&
      afterRecipes.some((r) => r.title === 'Tarte test export') &&
      afterRecipes.some((r) => r.title === 'Tarte test export (2)') &&
      afterRecipes.some((r) => r.title === 'Salade test export (2)')
  );
  check('E4 : recettes d\'origine intactes (pas d\'écrasement silencieux)',
    afterRecipes.filter((r) => r.instructions.includes('45 min')).length === 2 &&
      afterRecipes.find((r) => r.title === 'Tarte test export')?.instructions === 'Éplucher les pommes.\nCuire 45 min.'
  );
  const ingredientsAfter = (await db.select().from(ingredients)).length;
  check('E4 : catalogue d\'ingrédients non dupliqué (rapprochement par nom)', ingredientsAfter === 15);
  const mealsAfter = await db.select({ date: mealPlans.date, mealType: mealPlans.mealType, customNote: mealPlans.customNote, servings: mealPlans.servings, recipeId: mealPlans.recipeId }).from(mealPlans);
  check('E4 : planning doublé à l\'identique (nouveaux ids de recettes)',
    mealsAfter.length === 4 && mealsAfter.filter((m) => m.date === '2026-11-10' && m.mealType === 'lunch').length === 2 &&
      mealsAfter.filter((m) => m.date === '2026-11-12' && m.customNote === 'Restes du dimanche').length === 2
  );
  const pantryAfter = await db.select().from(pantryItems);
  check('E4 : garde-manger toujours unique par ingrédient (upsert)',
    pantryAfter.length === 1 && pantryAfter[0].quantity === 250 && pantryAfter[0].unit === 'g'
  );
  const [settingsAfter] = await db.select().from(appSettings).where(eq(appSettings.id, 1));
  check('E4 : paramètres inchangés après réimport identique',
    settingsAfter.defaultServings === 5 && settingsAfter.theme === 'rose'
  );

  // --- E5 : essai expiré → import refusé, export toujours OK ----------------
  const e5 = runChild(path.join(tmpDir, 'base-expiree.db'), payloadPath, 40);
  check('E5 : essai expiré (40 j) → import REFUSÉ', e5.result?.success === false && /refus[eé]/i.test(e5.result?.message ?? ''));
  check('E5 : rien écrit après refus', e5.rows.recipes.length === 0 && e5.rows.meal_plans.length === 0);
  check('E5 : export TOUJOURS autorisé en essai expiré', e5.exportOk === true);

  console.log(`\n${passed} tests PASS`);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* base jetable encore ouverte sous Windows */ }
  process.exit(0);
}

main().catch((e) => {
  console.error('FAIL exception', e);
  process.exit(1);
});
