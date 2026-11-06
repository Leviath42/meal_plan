// scripts/seed-standards.ts — F16 : quantités standard par ingrédient.
//
// Enrichit la table `ingredient_standards` (~35 ingrédients courants : pâtes
// 100 g/pers, riz 80 g/pers, oignon 1 pièce/4 pers, ail 1 gousse/4 pers…)
// sans jamais toucher aux données existantes :
//   - idempotent : INSERT OR IGNORE sur ingredient_id UNIQUE (les standards
//     déjà présents, y compris personnalisés par la famille, sont ignorés) ;
//   - non destructif : aucun ingrédient, recette, association, plan ou
//     standard existant n'est modifié ; les ingrédients inconnus du catalogue
//     sont ignorés (résolution par nom insensible à la casse — C-055) ;
//   - sûr sur une base en service : aucune migration, simple insertion.
//
// Usage : npx tsx scripts/seed-standards.ts   (applicable autant de fois que
// voulu, sur une base vierge comme sur une base de production ; SQLITE_PATH
// prioritaire sur data/sqlite.db pour les tests sur base jetable)

import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import path from 'path';

const dbPath =
  process.env.SQLITE_PATH ?? path.join(process.cwd(), 'data', 'sqlite.db');
mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');

// Standard culinaire : `quantity` `unit` pour `servingsRef` personnes
const STANDARDS: { name: string; quantity: number; unit: string; servingsRef: number }[] = [
  // Féculents secs (g / personne)
  { name: 'Pâtes alimentaires', quantity: 100, unit: 'g', servingsRef: 1 },
  { name: 'Spaghetti', quantity: 100, unit: 'g', servingsRef: 1 },
  { name: 'Pâtes penne', quantity: 100, unit: 'g', servingsRef: 1 },
  { name: 'Tagliatelles', quantity: 100, unit: 'g', servingsRef: 1 },
  { name: 'Riz basmati', quantity: 80, unit: 'g', servingsRef: 1 },
  { name: 'Riz complet', quantity: 80, unit: 'g', servingsRef: 1 },
  { name: 'Riz arborio', quantity: 80, unit: 'g', servingsRef: 1 },
  { name: 'Semoule', quantity: 80, unit: 'g', servingsRef: 1 },
  { name: 'Quinoa', quantity: 80, unit: 'g', servingsRef: 1 },
  { name: 'Boulgour', quantity: 80, unit: 'g', servingsRef: 1 },
  { name: 'Couscous', quantity: 80, unit: 'g', servingsRef: 1 },
  { name: 'Lentilles vertes', quantity: 75, unit: 'g', servingsRef: 1 },
  { name: 'Lentilles corail', quantity: 75, unit: 'g', servingsRef: 1 },
  { name: 'Pois chiches', quantity: 75, unit: 'g', servingsRef: 1 },
  { name: 'Pommes de terre', quantity: 200, unit: 'g', servingsRef: 1 },
  { name: 'Pomme de terre', quantity: 200, unit: 'g', servingsRef: 1 },
  { name: 'Patate douce', quantity: 200, unit: 'g', servingsRef: 1 },
  // Légumes (la pièce repartie sur plusieurs couverts)
  { name: 'Oignon', quantity: 1, unit: 'pièce', servingsRef: 4 },
  { name: 'Oignon rouge', quantity: 1, unit: 'pièce', servingsRef: 4 },
  { name: 'Oignon jaune', quantity: 1, unit: 'pièce', servingsRef: 4 },
  { name: 'Échalote', quantity: 1, unit: 'pièce', servingsRef: 4 },
  { name: 'Ail', quantity: 1, unit: 'gousse', servingsRef: 4 },
  { name: 'Carotte', quantity: 1, unit: 'pièce', servingsRef: 2 },
  { name: 'Tomate', quantity: 1, unit: 'pièce', servingsRef: 2 },
  { name: 'Courgette', quantity: 1, unit: 'pièce', servingsRef: 2 },
  { name: 'Poireau', quantity: 1, unit: 'pièce', servingsRef: 4 },
  // Viandes & poissons (g ou pièce / personne)
  { name: 'Viande hachée de bœuf', quantity: 125, unit: 'g', servingsRef: 1 },
  { name: 'Steak de bœuf', quantity: 1, unit: 'pièce', servingsRef: 1 },
  { name: 'Blanc de poulet', quantity: 150, unit: 'g', servingsRef: 1 },
  { name: 'Escalope de poulet', quantity: 1, unit: 'pièce', servingsRef: 1 },
  { name: 'Poulet entier', quantity: 1, unit: 'pièce', servingsRef: 4 },
  { name: 'Saumon', quantity: 150, unit: 'g', servingsRef: 1 },
  { name: 'Cabillaud', quantity: 150, unit: 'g', servingsRef: 1 },
  // Divers
  { name: 'Œufs', quantity: 1, unit: 'pièce', servingsRef: 2 },
  { name: 'Fromage râpé', quantity: 30, unit: 'g', servingsRef: 1 },
  { name: 'Emmental', quantity: 30, unit: 'g', servingsRef: 1 },
  { name: 'Parmesan', quantity: 15, unit: 'g', servingsRef: 1 },
  { name: 'Pain', quantity: 1, unit: 'pièce', servingsRef: 2 },
  { name: 'Baguette', quantity: 1, unit: 'pièce', servingsRef: 4 },
];

async function main() {
  console.log('Quantités standard par ingrédient (F16)');
  console.log(`${STANDARDS.length} standards dans la bibliothèque\n`);

  // La table arrive avec la migration 0008 : jamais de SQL de migration ici,
  // on refuse proprement si la base n'a pas encore été réconciliée.
  const hasTable = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ingredient_standards'"
    )
    .get();
  if (!hasTable) {
    console.error(
      'Erreur : la table ingredient_standards est absente — lancez « npm run db:ensure » d’abord.'
    );
    sqlite.close();
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;
  let notFound = 0;

  const run = sqlite.transaction(() => {
    for (const standard of STANDARDS) {
      // Résolution par nom insensible à la casse (pas d'ilike en SQLite, C-055)
      const ingredient = sqlite
        .prepare('SELECT id FROM ingredients WHERE LOWER(name) = LOWER(?)')
        .get(standard.name) as { id: string } | undefined;
      if (!ingredient) {
        notFound++;
        continue;
      }
      const result = sqlite
        .prepare(
          'INSERT OR IGNORE INTO ingredient_standards (id, ingredient_id, quantity, unit, servings_ref) VALUES (?,?,?,?,?)'
        )
        .run(
          crypto.randomUUID(),
          ingredient.id,
          standard.quantity,
          standard.unit,
          standard.servingsRef
        );
      if (result.changes > 0) inserted++;
      else skipped++;
    }
  });
  run();

  // Les doublons de la bibliothèque pointent sur le même ingrédient : le
  // IGNORE les compte une seule fois côté table, mais skipped comptabilise
  // les collisions (bibliothèque OU pré-existants) — c'est le contrat Q4.
  console.log(`  ✓ ${inserted} standards ajoutés`);
  console.log(`  • ${skipped} déjà présents (ignorés — aucune donnée modifiée)`);
  if (notFound > 0) {
    console.log(`  • ${notFound} ingrédients absents du catalogue (ignorés — lancez « npm run db:seed-ingredients »)`);
  }
  const [{ total }] = sqlite
    .prepare('SELECT COUNT(*) as total FROM ingredient_standards')
    .all() as { total: number }[];
  console.log(`\nStandards en base : ${total}`);
  sqlite.close();
}

main().catch((error) => {
  console.error('Erreur :', error);
  process.exit(1);
});
