'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth-guards';
import { recipes, ingredients, recipeIngredients } from '@/lib/db/schema';
import { importedRecipeSchema, fetchRecipeFromUrl } from '@/lib/recipe-import';
import { ilike, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type ImportPreviewState = {
  preview?: z.infer<typeof importedRecipeSchema> & { host: string };
  error?: string;
} | null;

const urlSchema = z.object({
  url: z.string().min(1, 'URL requise').max(500),
});

// Étape 1 : récupère et parse l'URL, renvoie la prévisualisation (rien n'est écrit)
export async function previewRecipeFromUrl(
  prevState: ImportPreviewState,
  formData: FormData
): Promise<ImportPreviewState> {
  await requireSession();
  const parsed = urlSchema.safeParse({ url: String(formData.get('url') ?? '') });
  if (!parsed.success) {
    return { error: 'URL requise.' };
  }
  const result = await fetchRecipeFromUrl(parsed.data.url);
  if (result.ok === false) {
    return { error: result.error };
  }
  return { preview: { ...result.recipe, host: result.host } };
}

const confirmSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().max(2000).optional().nullable(),
  prepTime: z.coerce.number().int().min(0).default(0),
  cookTime: z.coerce.number().int().min(0).default(0),
  defaultServings: z.coerce.number().int().min(1).default(4),
  instructions: z.string().max(20000).default(''),
  tags: z.string().max(300).optional().nullable(),
  source: z.string().max(500),
  ingredientsJson: z.string().max(20000),
});

// Étape 2 : crée la recette (transaction synchrone better-sqlite3) + crée les
// ingrédients inconnus du catalogue (match insensible à la casse sur le nom)
export async function confirmRecipeImport(
  prevState: { recipeId?: string; error?: string } | null,
  formData: FormData
): Promise<{ recipeId?: string; error?: string } | null> {
  const session = await requireSession();
  let ingredientsParsed: unknown;
  try {
    ingredientsParsed = JSON.parse(String(formData.get('ingredientsJson') ?? '[]'));
  } catch {
    return { error: 'Données d’ingrédients invalides.' };
  }
  const parsed = confirmSchema.safeParse({
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? '') || null,
    prepTime: String(formData.get('prepTime') ?? '0'),
    cookTime: String(formData.get('cookTime') ?? '0'),
    defaultServings: String(formData.get('defaultServings') ?? '4'),
    instructions: String(formData.get('instructions') ?? ''),
    tags: String(formData.get('tags') ?? '') || null,
    source: String(formData.get('source') ?? ''),
    ingredientsJson: String(formData.get('ingredientsJson') ?? '[]'),
  });
  if (!parsed.success) {
    return { error: 'Données invalides : ' + parsed.error.issues.map((i) => i.message).join(', ') };
  }
  const { ingredientsJson, ...recipeData } = parsed.data;
  const rawIngredients = importedRecipeSchema.shape.ingredients.parse(ingredientsParsed);

  // Doublon de titre : suffixe " (2)", " (3)"…
  const existing = await db
    .select({ title: recipes.title })
    .from(recipes)
    .where(ilike(recipes.title, recipeData.title));
  let title = recipeData.title;
  if (existing.some((r) => r.title.toLowerCase() === title.toLowerCase())) {
    let n = 2;
    while (existing.some((r) => r.title.toLowerCase() === `${recipeData.title} (${n})`.toLowerCase())) n++;
    title = `${recipeData.title} (${n})`;
  }

  // better-sqlite3 synchrone : transaction à callback synchrone
  const recipeId = db.transaction((tx) => {
    const recipe = tx
      .insert(recipes)
      .values({
        title,
        description: recipeData.description,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        defaultServings: recipeData.defaultServings,
        instructions: recipeData.instructions,
        tags: recipeData.tags,
        source: recipeData.source,
        created_by: session.user?.email ?? null,
      })
      .returning({ id: recipes.id })
      .get();

    for (const ing of rawIngredients) {
      // Retrouve l'ingrédient du catalogue (insensible à la casse), sinon le crée
      const foundRows = tx
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(ilike(ingredients.name, ing.name))
        .limit(1)
        .all();
      let ingredientId = foundRows[0]?.id;
      if (!ingredientId) {
        const created = tx
          .insert(ingredients)
          .values({ name: ing.name, category: 'Importé', defaultUnit: ing.unit ?? 'pièce' })
          .returning({ id: ingredients.id })
          .get();
        ingredientId = created.id;
      }
      if (ing.quantity) {
        tx.insert(recipeIngredients)
          .values({ recipeId: recipe.id, ingredientId, quantity: ing.quantity, unit: ing.unit ?? 'pièce' })
          .run();
      }
    }
    return recipe.id;
  });

  revalidatePath('/recipes');
  return { recipeId };
}
