import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mealplan-smoke-'));
const dbPath = path.join(tmpDir, 'smoke.db');
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
  execFileSync(
    'npx',
    ['tsx', 'scripts/db-ensure.ts', path.join(process.cwd(), 'drizzle'), dbPath],
    { stdio: 'inherit', shell: process.platform === 'win32' }
  );

  const { db } = await import('../lib/db');
  const { users, recipes, ingredients, recipeIngredients, mealPlans, accessTokens } =
    await import('../lib/db/schema');
  const { eq } = await import('drizzle-orm');
  const Argon2 = (await import('@node-rs/argon2')).default;
  const { validateAccessToken } = await import('../app/actions/tokens');

  const password = 'MotDePasse-Test-2026!';
  const hash = await Argon2.hash(password);
  const [user] = await db
    .insert(users)
    .values({ email: 'smoke@test.local', name: 'Smoke', password: hash, role: 'ADMIN' })
    .returning();
  check('insert user', !!user?.id);
  const [reloaded] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'smoke@test.local'));
  check('argon2 verify ok', await Argon2.verify(reloaded.password, password));
  check('argon2 mauvais mot de passe rejete', !(await Argon2.verify(reloaded.password, 'faux')));

  const [recipe] = await db
    .insert(recipes)
    .values({ title: 'Smoke Lasagnes', prepTime: 20, cookTime: 45, instructions: 'etapes', created_by: user.id })
    .returning();
  const [ingredient] = await db
    .insert(ingredients)
    .values({ name: 'Smoke Pate', category: 'Epicerie', defaultUnit: 'g' })
    .returning();
  await db
    .insert(recipeIngredients)
    .values({ recipeId: recipe.id, ingredientId: ingredient.id, quantity: 500, unit: 'g' });
  const [meal] = await db
    .insert(mealPlans)
    .values({ date: '2026-11-05', mealType: 'dinner', recipeId: recipe.id, servings: 4 })
    .returning();
  check('insert recette + ingredient + lien + repas', !!recipe?.id && !!meal?.id);
  const [joined] = await db
    .select({ title: recipes.title, date: mealPlans.date, qty: recipeIngredients.quantity })
    .from(mealPlans)
    .leftJoin(recipes, eq(mealPlans.recipeId, recipes.id))
    .leftJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
    .where(eq(mealPlans.id, meal.id));
  check(
    'jointure repas -> recette -> ingredient',
    joined?.title === 'Smoke Lasagnes' && joined?.date === '2026-11-05' && joined?.qty === 500
  );

  const clearToken = randomBytes(32).toString('hex');
  const hashed = `sha256:${createHash('sha256').update(clearToken).digest('hex')}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const [tokenRow] = await db
    .insert(accessTokens)
    .values({ token: hashed, type: 'api', expiresAt, createdByUserId: user.id })
    .returning();
  check('jeton stocke hashe (jamais en clair)', tokenRow.token !== clearToken);
  const valid = await validateAccessToken(clearToken, ['api']);
  check('validateAccessToken accepte le jeton', !!valid && valid.id === tokenRow.id);
  check('validateAccessToken refuse le mauvais type', !(await validateAccessToken(clearToken, ['calendar_read'])));
  await db
    .update(accessTokens)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(accessTokens.id, tokenRow.id));
  check('validateAccessToken refuse le jeton revoque', !(await validateAccessToken(clearToken, ['api'])));

  console.log(`\n${passed} tests PASS`);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* base jetable encore ouverte sous Windows */ }
  process.exit(0);
}

main().catch((e) => {
  console.error('FAIL exception', e);
  process.exit(1);
});
