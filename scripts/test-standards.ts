import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Test runtime F16 : calcul de mise à l'échelle des quantités standard (pur)
// + seed idempotent sur base jetable (SQLITE_PATH + db-ensure), pattern de
// scripts/test-import-recipe.ts.

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mealplan-standards-'));
const dbPath = path.join(tmpDir, 'standards.db');
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
  // shell:true sous Windows : spawnSync('npx') y échoue (ENOENT) car npm y
  // expose npx.cmd, pas npx.exe (leçon C-056)
  execFileSync('npx', ['tsx', 'scripts/db-ensure.ts', path.join(process.cwd(), 'drizzle'), dbPath], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  const { scaleStandardQuantity } = await import('../lib/standards');
  const { db } = await import('../lib/db');
  const { ingredients, ingredientStandards } = await import('../lib/db/schema');

  // ============================================================================
  // Q1 — Mise à l'échelle par couverts (calcul pur)
  // ============================================================================
  const pates = { quantity: 100, servingsRef: 1 };
  check(
    'pâtes 100 g/pers × 4 couverts = 400',
    scaleStandardQuantity(pates, 4) === 400
  );
  check(
    'pâtes 100 g/pers × 6 couverts = 600',
    scaleStandardQuantity(pates, 6) === 600
  );

  const ail = { quantity: 1, servingsRef: 4 };
  check('ail 1 gousse/4 pers × 4 couverts = 1', scaleStandardQuantity(ail, 4) === 1);
  check('ail 1 gousse/4 pers × 2 couverts = 0,5', scaleStandardQuantity(ail, 2) === 0.5);
  check('ail 1 gousse/4 pers × 6 couverts = 1,5', scaleStandardQuantity(ail, 6) === 1.5);
  check(
    'fraction 250 g/4 pers × 3 couverts = 187,5 (arrondi 2 décimales)',
    scaleStandardQuantity({ quantity: 250, servingsRef: 4 }, 3) === 187.5
  );

  // ============================================================================
  // Pas de pré-remplissage en couverts invalides (Q3 côté calcul)
  // ============================================================================
  check('couverts 0 → null (pas de pré-remplissage)', scaleStandardQuantity(pates, 0) === null);
  check('couverts négatifs → null', scaleStandardQuantity(pates, -2) === null);
  check('couverts absents → null', scaleStandardQuantity(pates, null) === null);
  check('couverts NaN → null', scaleStandardQuantity(pates, Number.NaN) === null);

  // ============================================================================
  // Q4 — Seed idempotent sur base jetable
  // ============================================================================
  // Catalogue minimal : les noms exacts de la bibliothèque + un nom en
  // minuscules (résolution insensible à la casse) + deux ingrédients sans
  // standard dans la bibliothèque
  const inserted = await db
    .insert(ingredients)
    .values([
      { id: 'ing-pates', name: 'Pâtes alimentaires', category: 'Épicerie Salée', defaultUnit: 'g' },
      { id: 'ing-ail', name: 'Ail', category: 'Fruits & Légumes', defaultUnit: 'pièce' },
      { id: 'ing-riz', name: 'riz basmati', category: 'Épicerie Salée', defaultUnit: 'g' },
      { id: 'ing-chocolat', name: 'Chocolat noir', category: 'Épicerie Sucrée', defaultUnit: 'g' },
      { id: 'ing-maison', name: 'Ingrédient maison', category: 'Divers', defaultUnit: 'pièce' },
    ])
    .onConflictDoNothing();
  check('catalogue de test inséré', inserted.changes === 5);

  // Standard personnalisé PRÉ-EXISTANT : le seed ne doit jamais l'écraser
  await db.insert(ingredientStandards).values({
    id: 'std-maison',
    ingredientId: 'ing-maison',
    quantity: 123,
    unit: 'pièce',
    servingsRef: 2,
  });

  const runSeed = () =>
    execFileSync('npx', ['tsx', 'scripts/seed-standards.ts'], {
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: process.platform === 'win32',
      env: { ...process.env, SQLITE_PATH: dbPath },
    });

  runSeed();

  const { getIngredientStandardsMap } = await import('../lib/standards');
  const map = await getIngredientStandardsMap();
  check(
    'seed : standard pâtes en base (100 g, 1 pers)',
    map['ing-pates']?.quantity === 100 && map['ing-pates']?.unit === 'g' && map['ing-pates']?.servingsRef === 1
  );
  check(
    'seed : standard ail en base (1 gousse, 4 pers)',
    map['ing-ail']?.quantity === 1 && map['ing-ail']?.unit === 'gousse' && map['ing-ail']?.servingsRef === 4
  );
  check(
    'seed : résolution insensible à la casse (« riz basmati » trouvé)',
    map['ing-riz']?.quantity === 80 && map['ing-riz']?.unit === 'g'
  );
  check(
    'Q3 : ingrédient sans standard absent de la map',
    map['ing-chocolat'] === undefined
  );
  check(
    'seed non destructif : standard personnalisé intact',
    map['ing-maison']?.quantity === 123 && map['ing-maison']?.servingsRef === 2
  );

  const rowsBefore = await db.select().from(ingredientStandards);

  // ============================================================================
  // Q4 — 2e passage : 100 % ignoré, aucune donnée touchée
  // ============================================================================
  runSeed();

  const rowsAfter = await db.select().from(ingredientStandards);
  check(
    'seed idempotent : nombre de lignes identique au 2e passage',
    rowsAfter.length === rowsBefore.length && rowsBefore.length > 0
  );
  const sortRows = (rows: typeof rowsAfter) =>
    rows
      .map((r) => `${r.id}|${r.ingredientId}|${r.quantity}|${r.unit}|${r.servingsRef}`)
      .sort();
  check(
    'seed idempotent : aucune ligne créée ni modifiée au 2e passage',
    JSON.stringify(sortRows(rowsAfter)) === JSON.stringify(sortRows(rowsBefore))
  );

  const mapAfter = await getIngredientStandardsMap();
  check(
    'standard personnalisé toujours intact après le 2e passage',
    mapAfter['ing-maison']?.quantity === 123 && mapAfter['ing-maison']?.unit === 'pièce'
  );

  console.log(`\n${passed} PASS`);
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // meilleur-effort sous Windows si un handle résiste
  }
}

main().catch((error) => {
  console.error('Erreur :', error);
  process.exit(1);
});
