// lib/import.ts — F18 : import d'une enveloppe d'export JSON.
//
// Règles (contrat vague 4, W5) :
// - validation STRICTE en amont (Zod, objets fermés, références croisées
//   vérifiées) : un fichier invalide n'ouvre même pas la transaction ;
// - transaction ATOMIQUE better-sqlite3 (synchrone, jamais await — C-047) :
//   le moindre échec au milieu annule tout, aucune ligne n'est écrite ;
// - doublons de titre de recette suffixés « (2) », « (3) »… même règle que
//   l'import URL F07 (helpers insensibles à la casse de recipe-import-db,
//   LOWER() — jamais ilike(), inexistant en SQLite — C-055) ;
// - ingrédients rapprochés par nom sans tenir compte de la casse : un import
//   sur base déjà peuplée ne duplique pas le catalogue ;
// - cohérence licence : l'import ÉCRIT en base, il est refusé en essai
//   expiré/licence inactive (isWriteAllowed) — l'export, simple lecture,
//   reste toujours autorisé.

import { z } from 'zod';
import { db } from '@/lib/db';
import {
  recipes,
  ingredients,
  recipeIngredients,
  mealPlans,
  pantryItems,
  appSettings,
} from '@/lib/db/schema';
import {
  recipeTitleEqualsIgnoreCase,
  ingredientNameEqualsIgnoreCase,
} from '@/lib/recipe-import-db';
import { isWriteAllowed } from '@/lib/license';
import { ensurePrimaryHousehold } from '@/lib/household';
import { THEMES } from '@/lib/themes';
import { EXPORT_FORMAT, EXPORT_VERSION } from '@/lib/export';

export interface ImportResult {
  success: boolean;
  message: string;
  counts?: {
    recipes: number;
    ingredients: number;
    recipe_ingredients: number;
    meal_plans: number;
    pantry_items: number;
  };
}

// ---------------------------------------------------------------------------
// Validation Zod (objets FERMÉS : toute clé inconnue est refusée)
// ---------------------------------------------------------------------------

const idSchema = z.string().min(1).max(64);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (AAAA-MM-JJ)');
const isoDateNullable = isoDate.nullable();

const ingredientRowSchema = z.strictObject({
  id: idSchema,
  name: z.string().trim().min(1, 'Nom d’ingrédient requis').max(200),
  category: z.string().trim().min(1).max(100),
  defaultUnit: z.string().trim().min(1).max(50),
}).describe('ingrédient');

const recipeRowSchema = z.strictObject({
  id: idSchema,
  title: z.string().trim().min(1, 'Titre requis').max(150),
  description: z.string().max(2000).nullable(),
  prepTime: z.coerce.number().int().min(0, 'Temps de préparation invalide').max(1440),
  cookTime: z.coerce.number().int().min(0, 'Temps de cuisson invalide').max(1440),
  defaultServings: z.coerce.number().int().min(1, 'Au moins 1 couvert requis').max(20, 'Maximum 20 couverts'),
  mealCourse: z.string().max(50).nullable(),
  instructions: z.string().max(20000),
  tags: z.string().max(300).nullable(),
  source: z.string().max(500).nullable(),
  created_by: z.string().max(200).nullable(),
  lastServedAt: isoDateNullable,
}).describe('recette');

const linkRowSchema = z.strictObject({
  recipeId: idSchema,
  ingredientId: idSchema,
  quantity: z.coerce.number().min(0, 'Quantité invalide').max(1_000_000),
  unit: z.string().trim().min(1).max(50),
  note: z.string().max(200).nullable(),
}).describe('liaison recette-ingrédient');

const mealPlanRowSchema = z.strictObject({
  date: isoDate,
  mealType: z.enum(['breakfast', 'lunch', 'snack', 'dinner'], { message: 'Type de repas invalide' }),
  customNote: z.string().max(300).nullable(),
  servings: z.coerce.number().int().min(1, 'Au moins 1 couvert requis').max(20, 'Maximum 20 couverts').nullable(),
  mealCourse: z.string().max(50).nullable(),
  recipeId: idSchema.nullable(),
}).describe('repas planifié');

const pantryRowSchema = z.strictObject({
  ingredientId: idSchema,
  quantity: z.coerce.number().min(0, 'Quantité de stock invalide').max(1_000_000),
  unit: z.string().trim().min(1).max(50),
  expiresAt: isoDateNullable,
}).describe('article de garde-manger');

const appSettingsRowSchema = z.strictObject({
  defaultServings: z.coerce.number().int().min(1, 'Au moins 1 couvert requis').max(20, 'Maximum 20 couverts'),
  theme: z.string().refine(
    (id) => THEMES.some((t) => t.id === id),
    { message: 'Thème inconnu' },
  ),
}).describe('paramètres');

const envelopeSchema = z.strictObject({
  format: z.literal(EXPORT_FORMAT),
  version: z.number().int(),
  exported_at: z.string().min(10).max(40),
  data: z.strictObject({
    recipes: z.array(z.unknown()).max(10_000),
    ingredients: z.array(z.unknown()).max(20_000),
    recipe_ingredients: z.array(z.unknown()).max(100_000),
    meal_plans: z.array(z.unknown()).max(50_000),
    pantry_items: z.array(z.unknown()).max(10_000),
    app_settings: z.unknown().nullable(),
  }),
});

type Envelope = z.infer<typeof envelopeSchema>;

type ParsedPayload = {
  recipes: z.infer<typeof recipeRowSchema>[];
  ingredients: z.infer<typeof ingredientRowSchema>[];
  recipe_ingredients: z.infer<typeof linkRowSchema>[];
  meal_plans: z.infer<typeof mealPlanRowSchema>[];
  pantry_items: z.infer<typeof pantryRowSchema>[];
  app_settings: z.infer<typeof appSettingsRowSchema> | null;
};

// Message d'erreur : les premières issues Zod, localisées par leur chemin.
function zodMessage(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || 'fichier'} : ${issue.message}`)
    .join(' ; ');
}

// Valide chaque section du bloc data avec SON schéma (messages dédiés par
// type de ligne, ex. « un ingrédient invalide ») puis les références croisées.
function parseSections(envelope: Envelope): ParsedPayload {
  const parsedRecipes = z.array(recipeRowSchema).safeParse(envelope.data.recipes);
  if (!parsedRecipes.success) {
    throw new Error(`recettes — ${zodMessage(parsedRecipes.error)}`);
  }
  const parsedIngredients = z.array(ingredientRowSchema).safeParse(envelope.data.ingredients);
  if (!parsedIngredients.success) {
    throw new Error(`ingrédients — ${zodMessage(parsedIngredients.error)}`);
  }
  const parsedLinks = z.array(linkRowSchema).safeParse(envelope.data.recipe_ingredients);
  if (!parsedLinks.success) {
    throw new Error(`liaisons recette-ingrédient — ${zodMessage(parsedLinks.error)}`);
  }
  const parsedMeals = z.array(mealPlanRowSchema).safeParse(envelope.data.meal_plans);
  if (!parsedMeals.success) {
    throw new Error(`planning — ${zodMessage(parsedMeals.error)}`);
  }
  const parsedPantry = z.array(pantryRowSchema).safeParse(envelope.data.pantry_items);
  if (!parsedPantry.success) {
    throw new Error(`garde-manger — ${zodMessage(parsedPantry.error)}`);
  }
  let settings: z.infer<typeof appSettingsRowSchema> | null = null;
  if (envelope.data.app_settings !== null) {
    const parsedSettings = appSettingsRowSchema.safeParse(envelope.data.app_settings);
    if (!parsedSettings.success) {
      throw new Error(`paramètres — ${zodMessage(parsedSettings.error)}`);
    }
    settings = parsedSettings.data;
  }

  return {
    recipes: parsedRecipes.data,
    ingredients: parsedIngredients.data,
    recipe_ingredients: parsedLinks.data,
    meal_plans: parsedMeals.data,
    pantry_items: parsedPantry.data,
    app_settings: settings,
  };
}

// Références croisées AU SEIN du fichier : chaque liaison / repas / ligne de
// stock doit pointer vers une ligne présente. Un fichier qui pointe dans le
// vide est refusé AVANT toute écriture.
function checkCrossReferences(parsed: ParsedPayload): void {
  const recipeIds = new Set<string>();
  for (const r of parsed.recipes) {
    if (recipeIds.has(r.id)) {
      throw new Error(`recette en doublon dans le fichier (identifiant ${r.id})`);
    }
    recipeIds.add(r.id);
  }
  const ingredientIds = new Set<string>();
  for (const i of parsed.ingredients) {
    if (ingredientIds.has(i.id)) {
      throw new Error(`ingrédient en doublon dans le fichier (identifiant ${i.id})`);
    }
    ingredientIds.add(i.id);
  }
  for (const li of parsed.recipe_ingredients) {
    if (!recipeIds.has(li.recipeId)) {
      throw new Error(`liaison vers une recette absente du fichier (${li.recipeId})`);
    }
    if (!ingredientIds.has(li.ingredientId)) {
      throw new Error(`liaison vers un ingrédient absent du fichier (${li.ingredientId})`);
    }
  }
  for (const mp of parsed.meal_plans) {
    if (mp.recipeId !== null && !recipeIds.has(mp.recipeId)) {
      throw new Error(`repas du ${mp.date} pointant vers une recette absente du fichier (${mp.recipeId})`);
    }
  }
  for (const pi of parsed.pantry_items) {
    if (!ingredientIds.has(pi.ingredientId)) {
      throw new Error(`article de garde-manger pointant vers un ingrédient absent du fichier (${pi.ingredientId})`);
    }
  }
}

// ---------------------------------------------------------------------------
// Écriture (transaction synchrone better-sqlite3)
// ---------------------------------------------------------------------------

// Client Drizzle de la transaction better-sqlite3 (synchrone). Typé depuis
// db.transaction pour suivre le schéma sans duplication de type.
type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Antidoublon de titre : « Titre », « Titre (2) », « Titre (3) »… insensible à
// la casse — même règle que l'import URL F07 (C-055 : LOWER(), pas ilike()).
function uniqueRecipeTitle(tx: TxClient, title: string, householdId: string): string {
  const rows = tx
    .select({ title: recipes.title })
    .from(recipes)
    .where(recipeTitleEqualsIgnoreCase(title, householdId))
    .all();
  if (rows.length === 0) return title;
  let n = 2;
  while (rows.some((row) => row.title.toLowerCase() === `${title} (${n})`.toLowerCase())) n++;
  return `${title} (${n})`;
}

function applyImport(tx: TxClient, data: ParsedPayload, householdId: string): void {
  const now = new Date().toISOString();

  // 1. Ingrédients : rapprochés par nom sans casse, créé sinon. Les identifiants
  // du fichier sont remappés vers les identifiants réels (nouveaux ou existants).
  const ingredientIdMap = new Map<string, string>();
  for (const ing of data.ingredients) {
    const found = tx
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(ingredientNameEqualsIgnoreCase(ing.name, householdId))
      .limit(1)
      .all()[0];
    if (found) {
      ingredientIdMap.set(ing.id, found.id);
      continue;
    }
    const created = tx
      .insert(ingredients)
      .values({ name: ing.name, category: ing.category, defaultUnit: ing.defaultUnit, householdId })
      .returning({ id: ingredients.id })
      .get();
    ingredientIdMap.set(ing.id, created.id);
  }

  // 2. Recettes : TOUJOURS de nouvelles lignes (jamais d'écrasement silencieux
  // d'une recette existante), titre suffixé si déjà pris.
  const recipeIdMap = new Map<string, string>();
  for (const r of data.recipes) {
    const title = uniqueRecipeTitle(tx, r.title, householdId);
    const created = tx
      .insert(recipes)
      .values({
        title,
        description: r.description,
        prepTime: r.prepTime,
        cookTime: r.cookTime,
        defaultServings: r.defaultServings,
        mealCourse: r.mealCourse,
        instructions: r.instructions,
        tags: r.tags,
        source: r.source,
        created_by: r.created_by,
        lastServedAt: r.lastServedAt,
        householdId,
      })
      .returning({ id: recipes.id })
      .get();
    recipeIdMap.set(r.id, created.id);
  }

  // 3. Liaisons recette-ingrédient (identifiants remappés).
  for (const li of data.recipe_ingredients) {
    tx.insert(recipeIngredients)
      .values({
        recipeId: recipeIdMap.get(li.recipeId)!,
        ingredientId: ingredientIdMap.get(li.ingredientId)!,
        quantity: li.quantity,
        unit: li.unit,
        note: li.note,
        householdId,
      })
      .run();
  }

  // 4. Planning : recettes remappées ; repas sans recette (customNote) conservés.
  for (const mp of data.meal_plans) {
    tx.insert(mealPlans)
      .values({
        householdId,
        date: mp.date,
        mealType: mp.mealType,
        customNote: mp.customNote,
        // null préservé tel quel (repas sans couverts définis) : round-trip
        // exact avec l'export, la valeur par défaut 4 n'est appliquée qu'aux
        // nouvelles saisies côté application
        servings: mp.servings,
        mealCourse: mp.mealCourse,
        recipeId: mp.recipeId !== null ? recipeIdMap.get(mp.recipeId)! : null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  // 5. Garde-manger : un seul stock par ingrédient (contrainte unique) →
  // mise à jour de la ligne existante lors d'un import sur base peuplée.
  for (const pi of data.pantry_items) {
    const values = {
      ingredientId: ingredientIdMap.get(pi.ingredientId)!,
      householdId,
      quantity: pi.quantity,
      unit: pi.unit,
      expiresAt: pi.expiresAt,
      updatedAt: now,
    };
    tx.insert(pantryItems)
      .values(values)
      .onConflictDoUpdate({
        target: pantryItems.ingredientId,
        set: { quantity: values.quantity, unit: values.unit, expiresAt: values.expiresAt, updatedAt: now },
      })
      .run();
  }

  // 6. Paramètres : restauration des réglages du foyer (palettes connues).
  if (data.app_settings) {
    tx.insert(appSettings)
      .values({
        id: 1,
        defaultServings: data.app_settings.defaultServings,
        theme: data.app_settings.theme,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: {
          defaultServings: data.app_settings.defaultServings,
          theme: data.app_settings.theme,
          updatedAt: now,
        },
      })
      .run();
  }
}

// Point d'entrée réutilisable (action serveur et test runtime). Tout ou rien :
// en cas d'échec — validation ou contrainte SQL au milieu — RIEN n'est écrit.
export async function importExportData(payload: unknown, householdId?: string): Promise<ImportResult> {
  // L'import écrit en base : essai expiré ou licence inactive → refus explicite
  // (l'export, simple lecture, reste toujours autorisé — cohérent proxy.ts).
  const writeAllowed = await isWriteAllowed();
  if (!writeAllowed) {
    return {
      success: false,
      message:
        "Import refusé : la licence est inactive ou l'essai est expiré. Activez votre licence pour importer des données.",
    };
  }

  // Message français dédié si le format/la version ne correspondent pas (les
  // autres fichiers JSON refusés ici avec une erreur claire, pas un crash).
  if (
    typeof payload !== 'object' ||
    payload === null ||
    (payload as Record<string, unknown>).format !== EXPORT_FORMAT ||
    (payload as Record<string, unknown>).version !== EXPORT_VERSION
  ) {
    return {
      success: false,
      message: `Fichier non reconnu : ce format d'export n'est pas pris en charge (attendu : ${EXPORT_FORMAT} v${EXPORT_VERSION}).`,
    };
  }

  let envelope: Envelope;
  try {
    envelope = envelopeSchema.parse(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: `Fichier invalide : ${zodMessage(error)}` };
    }
    return { success: false, message: "Fichier invalide : structure non reconnue." };
  }

  let parsed: ParsedPayload;
  try {
    parsed = parseSections(envelope);
    checkCrossReferences(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'structure non reconnue';
    return { success: false, message: `Fichier invalide : ${message}` };
  }

  // F17 (C-062) : tout l'import est écrit DANS LE FOYER demandé par l'action
  // (celui de la session ADMIN). L'argument optionnel (tests runtime
  // historiques, base mono-foyer) retombe sur le foyer principal via le
  // backfill idempotent — calculé HORS transaction (le backfill ouvre la
  // sienne, better-sqlite3 gère l'imbrication en savepoint mais on reste
  // simple). Aucune ligne n'est écrite sans foyer.
  const hid = householdId ?? ensurePrimaryHousehold();

  try {
    db.transaction((tx) => applyImport(tx, parsed, hid));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Import annulé, aucune donnée n'a été écrite : ${detail}`,
    };
  }

  return {
    success: true,
    message:
      `Import réussi : ${parsed.recipes.length} recette(s), ${parsed.ingredients.length} ingrédient(s), ` +
      `${parsed.recipe_ingredients.length} liaison(s), ${parsed.meal_plans.length} repas planifié(s), ` +
      `${parsed.pantry_items.length} article(s) de garde-manger` +
      (parsed.app_settings ? ', paramètres appliqués' : '') + '.',
    counts: {
      recipes: parsed.recipes.length,
      ingredients: parsed.ingredients.length,
      recipe_ingredients: parsed.recipe_ingredients.length,
      meal_plans: parsed.meal_plans.length,
      pantry_items: parsed.pantry_items.length,
    },
  };
}
