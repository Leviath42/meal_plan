import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

// Test runtime F07 : serveur HTTP local qui sert une page avec JSON-LD Recipe,
// puis preview + confirm réels sur base jetable.

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mealplan-import-'));
const dbPath = path.join(tmpDir, 'import.db');
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

const HTML = `<!doctype html><html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Recipe","name":"Tarte aux pommes importée",
"description":"Une tarte simple","prepTime":"PT20M","cookTime":"PT45M","recipeYield":"6 personnes",
"recipeIngredient":["6 pommes","100 g de sucre","1 pâte brisée","20 g de beurre"],
"recipeInstructions":[{"@type":"HowToStep","text":"Éplucher les pommes."},{"@type":"HowToStep","text":"Cuire 45 min."}],
"keywords":["dessert","pomme"],"url":"http://RECETTE/"}
</script></head><body>ok</body></html>`;

// Page 2 : site qui fragmente les lignes d'ingrédients (nom / quantité en
// entrées SEPAREES, qualificatif isolé) + unités multi-mots (C-056)
const HTML_FRAGMENTED = `<!doctype html><html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Recipe","name":"Dhal de lentilles corail",
"description":"Un dhal crémeux","prepTime":"PT10M","cookTime":"PT25M","recipeYield":"4 personnes",
"recipeIngredient":["Lentilles corail","250 g","rouge","1 Oignon","Riz thaï","300 g","Lait de coco","200 ml",
"2 cuillères à soupe de coriandre fraîche","1 cuillère à café Huile d'olive","50 GR de pulpe de tomate",
"1/2 verre Bouillon","Piment","1 pincée"],
"recipeInstructions":["Cuire les lentilles."],"url":"http://RECETTE2/"}
</script></head><body>ok</body></html>`;

// Page 3 : site SANS JSON-LD — recette en microdata + metas og: (C-056)
const HTML_MICRODATA = `<!doctype html><html><head>
<meta property="og:title" content="Cake aux olives | Blog test"/>
<meta property="og:description" content="Un cake salé"/>
</head><body>
<ul>
<li itemprop="recipeIngredient">200 g de farine</li>
<li itemprop="recipeIngredient">3 œufs</li>
<li itemprop="recipeIngredient">100 g d'olives vertes</li>
</ul>
<div itemprop="recipeInstructions"><p>Mélanger la farine et les œufs.</p></div>
</body></html>`;

async function main() {
  // shell:true sous Windows : spawnSync('npx') y échoue (ENOENT) car npm y
  // expose npx.cmd, pas npx.exe — le test tourne ainsi aussi en local Windows
  execFileSync('npx', ['tsx', 'scripts/db-ensure.ts', path.join(process.cwd(), 'drizzle'), dbPath], { stdio: 'inherit', shell: process.platform === 'win32' });

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    if (req.url?.includes('/dhal')) res.end(HTML_FRAGMENTED.replace('http://RECETTE2/', `http://127.0.0.1:${PORT}/dhal`));
    else if (req.url?.includes('/cake')) res.end(HTML_MICRODATA);
    else res.end(HTML.replace('http://RECETTE/', `http://127.0.0.1:${PORT}/tarte`));
  });
  const PORT = 48123;
  await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', resolve));

  const { fetchRecipeFromUrl, normalizeRecipeUrl } = await import('../lib/recipe-import');
  const { ingredientNameEqualsIgnoreCase, recipeTitleEqualsIgnoreCase } = await import('../lib/recipe-import-db');
  const { db } = await import('../lib/db');
  const { users, recipes, ingredients, recipeIngredients } = await import('../lib/db/schema');
  const { eq } = await import('drizzle-orm');
  const Argon2 = (await import('@node-rs/argon2')).default;

  check('normalizeRecipeUrl ajoute https://', normalizeRecipeUrl('example.com/x')?.protocol === 'https:');
  check('normalizeRecipeUrl refuse javascript:', normalizeRecipeUrl('javascript:alert(1)') === null);

  const r1 = await fetchRecipeFromUrl(`http://127.0.0.1:${PORT}/tarte`);
  check('fetch OK sur JSON-LD', r1.ok === true);
  if (r1.ok) {
    check('titre extrait', r1.recipe.title === 'Tarte aux pommes importée');
    check('prepTime 20 min', r1.recipe.prepTime === 20);
    check('cookTime 45 min', r1.recipe.cookTime === 45);
    check('servings 6', r1.recipe.defaultServings === 6);
    check('4 ingrédients parsés', r1.recipe.ingredients.length === 4);
    check('ingrédient avec quantité', r1.recipe.ingredients[1]?.quantity === 100 && r1.recipe.ingredients[1]?.unit === 'g');
    check('étapes jointes', r1.recipe.instructions.includes('Éplucher') && r1.recipe.instructions.includes('Cuire 45 min'));
  }

  const r2 = await fetchRecipeFromUrl('http://127.0.0.1:1/rien'); // port fermé
  check('site injoignable -> erreur propre', r2.ok === false);

  // Lignes fragmentées + unités multi-mots (C-056)
  const r3 = await fetchRecipeFromUrl(`http://127.0.0.1:${PORT}/dhal`);
  check('fetch OK sur lignes fragmentées', r3.ok === true);
  if (r3.ok) {
    const ings = r3.recipe.ingredients;
    const find = (frag: string) => ings.find((i) => i.name.includes(frag));
    check('quantité séparée rattachée au nom', find('Lentilles corail')?.quantity === 250 && find('Lentilles corail')?.unit === 'g');
    check('qualificatif isolé suffixé à l’ingrédient suivant', find('Oignon')?.name === 'Oignon rouge');
    check('ligne nom + quantité rapprochées', find('Riz thaï')?.quantity === 300 && find('Riz thaï')?.unit === 'g');
    check('ingrédient sans unité unitaire', find('Oignon')?.quantity === 1 && !find('Oignon')?.unit);
    check('unité multi-mots normalisée', find('coriandre')?.unit === 'cuillère à soupe' && find('coriandre')?.quantity === 2);
    check('GR normalisé en g', find('pulpe de tomate')?.unit === 'g' && find('pulpe de tomate')?.quantity === 50);
    check('fraction 1/2 parsée', find('Bouillon')?.quantity === 0.5 && find('Bouillon')?.unit === 'verre');
    check('pincée = unité', find('Piment')?.unit === 'pincée');
    check('plus aucun fragment orphelin', !ings.some((i) => /^\d/.test(i.name) || /^à (soupe|café)/.test(i.name)));
  }

  // Site sans JSON-LD : fallback og: + microdata (C-056)
  const r4 = await fetchRecipeFromUrl(`http://127.0.0.1:${PORT}/cake`);
  check('fetch OK sur site sans JSON-LD', r4.ok === true);
  if (r4.ok) {
    check('titre og: extrait', r4.recipe.title.startsWith('Cake aux olives'));
    check('ingrédients microdata extraits', r4.recipe.ingredients.length === 3 && r4.recipe.ingredients.some((i) => i.name === 'farine'));
    check('instructions microdata extraites', r4.recipe.instructions.includes('Mélanger'));
    check('étiqueté import partiel', (r4.recipe.tags ?? '').includes('partiel'));
  }

  // Confirm : écriture réelle en base (transaction synchrone)
  const hash = await Argon2.hash('x');
  const [user] = await db.insert(users).values({ email: 'imp@test.local', password: hash, role: 'ADMIN' }).returning();
  void user;

  const recipeData = r1.ok ? r1.recipe : null;
  check('données de recette présentes', !!recipeData);
  const recipeId = db.transaction((tx) => {
    const recipe = tx
      .insert(recipes)
      .values({
        title: recipeData!.title, prepTime: 20, cookTime: 45,
        defaultServings: 6, instructions: recipeData!.instructions,
        source: `http://127.0.0.1:${PORT}/tarte`, created_by: 'imp@test.local',
      })
      .returning({ id: recipes.id }).get();
    for (const ing of recipeData!.ingredients) {
      // Même helper que l'action réelle (via lib/recipe-import-db) : le test
      // exécute la requête de production, pas une réplique (C-055)
      const foundRows = tx.select({ id: ingredients.id }).from(ingredients).where(ingredientNameEqualsIgnoreCase(ing.name)).limit(1).all();
      const found = foundRows[0];
      let id = found?.id;
      if (!id) id = tx.insert(ingredients).values({ name: ing.name, category: 'Importé', defaultUnit: ing.unit ?? 'pièce' }).returning({ id: ingredients.id }).get().id;
      if (ing.quantity) tx.insert(recipeIngredients).values({ recipeId: recipe.id, ingredientId: id, quantity: ing.quantity, unit: ing.unit ?? 'pièce' }).run();
    }
    return recipe.id;
  });
  check('recette insérée', !!recipeId);
  const [row] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
  check('titre en base', row.title === 'Tarte aux pommes importée');
  const ings = await db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId));
  check('4 ingrédients liés, tous avec quantité', ings.length === 4 && ings.every((i) => i.quantity > 0));
  // Recherche de doublon insensible à la casse — même helper que l'action
  // réelle : sans ça, le titre existant n'était pas retrouvé (C-055)
  await db.insert(recipes).values({ title: 'Souffle au Chocolat', prepTime: 10, cookTime: 15, instructions: 'x' });
  const doublons = await db.select({ title: recipes.title }).from(recipes).where(recipeTitleEqualsIgnoreCase('SOUFFLE AU CHOCOLAT'));
  check('doublon de titre trouvé sans tenir de la casse', doublons.some((d) => d.title === 'Souffle au Chocolat'));

  const cats = await db.select().from(ingredients);
  check('ingrédients créés au catalogue', cats.some((c) => c.name === 'pommes' || c.name === 'sucre'));

  server.close();
  console.log(`\n${passed} tests PASS`);
  // Meilleur effort : sous Windows la base jetable peut encore être ouverte par
  // better-sqlite3 au moment du nettoyage (EPERM) — pas bloquant, dossier temp
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
  process.exit(0);
}

main().catch((e) => {
  console.error('FAIL exception', e);
  process.exit(1);
});
