// lib/validators/generator.ts
// Générateur de planification : validation Zod des paramètres + logique
// PURE de sélection des recettes par créneau. Aucune dépendance à la base
// ou à Next : ce module est importé à la fois par la Server Action
// (app/actions/generator.ts) et par les tests d'exécution réelle (tmp/),
// qui rejouent exactement le même code.
import { z } from 'zod';

// ============================================================================
// Constantes partagées (mêmes valeurs que le reste de l'application)
// ============================================================================

// Types de repas : identiques au z.enum de mealPlanInput (app/types/meal-plan.ts)
export const GENERATOR_MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

// Types de plats : mêmes valeurs que MEAL_COURSE_ORDER (PlannerBoard) et le
// schéma recipes.mealCourse (lib/db/schema.ts)
export const GENERATOR_MEAL_COURSES = [
  'apéritif',
  'entrée',
  'plat',
  'accompagnement',
  'dessert',
  'boisson',
] as const;

// Unions littérales dérivées des constantes (typage partagé client/serveur)
export type GeneratorMealType = (typeof GENERATOR_MEAL_TYPES)[number];
export type GeneratorMealCourse = (typeof GENERATOR_MEAL_COURSES)[number];

// Valeurs de jours de semaine : index Date.getDay() (0 = dimanche, 1 = lundi...)

// Une date AAAA-MM-JJ doit exister dans le calendrier (le regex seul
// accepterait 2026-13-01) : aller-retour Date locale sans décalage
function isRealIsoDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

// ============================================================================
// Validation Zod des paramètres du générateur
// ============================================================================

export const generatorInput = z.object({
  // Date de début ISO AAAA-MM-JJ (comparaisons lexicographiques fiables)
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (AAAA-MM-JJ)')
    .refine(isRealIsoDate, 'Date invalide'),
  // Nombre de jours couverts à partir de la date de début
  daysCount: z.coerce.number().int('Le nombre de jours doit être un entier').min(1, 'Au moins 1 jour requis').max(30, 'Maximum 30 jours'),
  // Jours de semaine concernés (index Date.getDay(), 0 = dimanche) — au moins un
  weekdays: z.array(z.coerce.number().int().min(0).max(6)).min(1, 'Sélectionnez au moins un jour de la semaine'),
  // Types de repas à planifier — au moins un
  mealTypes: z.array(z.enum(GENERATOR_MEAL_TYPES)).min(1, 'Sélectionnez au moins un type de repas'),
  // Types de plats autorisés pour CHAQUE type de repas (les quatre clés sont
  // toujours envoyées par le client ; seules celles des repas cochés sont
  // utilisées) — au moins un type de plat par type de repas
  coursesByMealType: z.record(
    z.enum(GENERATOR_MEAL_TYPES),
    z.array(z.enum(GENERATOR_MEAL_COURSES)).min(1, 'Sélectionnez au moins un type de plat'),
  ),
  // Couverts appliqués à chaque repas généré
  servings: z.coerce.number().int('Le nombre de couverts doit être un entier').min(1, 'Au moins 1 couvert requis').max(20, 'Maximum 20 couverts'),
  // false = combler uniquement les créneaux vides ; true = remplacer
  // (supprimer) les repas existants des créneaux concernés
  replaceExisting: z.boolean().default(false),
  // Tags de recettes à exclure (déjà découpés et nettoyés par le client)
  excludedTags: z.array(z.string().trim().min(1)).default([]),
});

export type GeneratorParams = z.infer<typeof generatorInput>;

// Résultat retourné par la Server Action generateMealPlans
export interface GeneratorResult {
  success: boolean;
  message: string;
  // Repas créés par le générateur
  created: number;
  // Créneaux ignorés car déjà pris (mode « combler »)
  skipped: number;
  // Créneaux sans recette compatible
  noRecipe: number;
}

// ============================================================================
// Logique pure de sélection (rejouée par les tests d'exécution réelle)
// ============================================================================

// Recette candidate telle que chargée par la Server Action
export interface GeneratorRecipe {
  id: string;
  mealCourse: string | null;
  // Mots-clés séparés par des virgules (recipes.tags)
  tags: string | null;
}

// Repas planifié existant (référence minimale, fenêtre antidoublon)
export interface GeneratorPlanRef {
  id: string;
  date: string;
  mealType: string;
  recipeId: string | null;
}

// Décision pour un créneau (date + type de repas)
export interface SlotOutcome {
  date: string;
  mealType: string;
  // 'created' : repas généré ; 'skipped' : créneau déjà pris (mode combler) ;
  // 'no-recipe' : aucune recette compatible
  status: 'created' | 'skipped' | 'no-recipe';
  // Mode « remplacer » : les repas existants du créneau (y compris les notes
  // libres) doivent être supprimés avant l'insertion
  deleteExisting: boolean;
  // Recette choisie (status 'created' uniquement)
  recipeId?: string;
  // Type de plat hérité de la recette (mealCourse copié à l'insertion)
  mealCourse?: string | null;
}

// Décaler une date AAAA-MM-JJ de n jours (fuseau local, format stable).
// Copie minimale d'addDaysToDateStr (lib/meal-planning.ts) : ce module ne
// doit pas importer lib/db pour rester rejouable hors Next.
function isoAddDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

// Fenêtre antidoublon EXCLUSIVE (même règle que findPlanInWindow, F09) :
// un plan à exactement X jours d'écart est autorisé, moins de X jours refusé.
// Comparaison lexicographique sur les dates ISO.
function isWithinWindow(planDate: string, targetDate: string, minDays: number): boolean {
  if (minDays <= 0) return false;
  return planDate > isoAddDays(targetDate, -minDays) && planDate < isoAddDays(targetDate, minDays);
}

// Tags d'une recette, découpés et normalisés (minuscules, sans espaces)
function parseRecipeTags(tags: string | null): string[] {
  return (tags ?? '')
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0);
}

// Décider du contenu de chaque créneau, dans l'ordre chronologique fourni :
// - mode « combler » : créneau déjà pris -> 'skipped'
// - mode « remplacer » : repas existants à supprimer -> deleteExisting
// - recette aléatoire parmi celles dont mealCourse est autorisé pour le type
//   de repas, sans tag exclu, et hors fenêtre antidoublon (repas existants
//   ET repas générés dans ce même run — liste locale)
// - aucune recette compatible -> 'no-recipe'
export function decideGeneratorSlots(opts: {
  slots: { date: string; mealType: string }[];
  coursesByMealType: Record<string, string[]>;
  replaceExisting: boolean;
  excludedTags: string[];
  recipes: GeneratorRecipe[];
  existingPlans: GeneratorPlanRef[];
  minDays: number;
}): SlotOutcome[] {
  // Repas existants par créneau « date|mealType » (mode combler/remplacer)
  const existingBySlot = new Map<string, GeneratorPlanRef[]>();
  // Dates de planification par recette : repas existants + générés du run
  const plannedDatesByRecipe = new Map<string, string[]>();
  for (const plan of opts.existingPlans) {
    const slotKey = `${plan.date}|${plan.mealType}`;
    const slotPlans = existingBySlot.get(slotKey);
    if (slotPlans) slotPlans.push(plan);
    else existingBySlot.set(slotKey, [plan]);

    if (plan.recipeId) {
      const dates = plannedDatesByRecipe.get(plan.recipeId);
      if (dates) dates.push(plan.date);
      else plannedDatesByRecipe.set(plan.recipeId, [plan.date]);
    }
  }

  const excluded = new Set(opts.excludedTags.map(tag => tag.trim().toLowerCase()));

  const outcomes: SlotOutcome[] = [];
  for (const slot of opts.slots) {
    const existing = existingBySlot.get(`${slot.date}|${slot.mealType}`) ?? [];

    // Mode « combler » : créneau déjà pris -> ignoré
    if (!opts.replaceExisting && existing.length > 0) {
      outcomes.push({ date: slot.date, mealType: slot.mealType, status: 'skipped', deleteExisting: false });
      continue;
    }

    // Candidates : mealCourse autorisé pour ce type de repas, sans tag exclu,
    // hors fenêtre antidoublon (repas existants + générés dans ce run)
    const allowedCourses = opts.coursesByMealType[slot.mealType] ?? [];
    const candidates = opts.recipes.filter(recipe => {
      if (!recipe.mealCourse || !allowedCourses.includes(recipe.mealCourse)) return false;
      if (parseRecipeTags(recipe.tags).some(tag => excluded.has(tag))) return false;
      const dates = plannedDatesByRecipe.get(recipe.id) ?? [];
      return !dates.some(date => isWithinWindow(date, slot.date, opts.minDays));
    });

    if (candidates.length === 0) {
      outcomes.push({
        date: slot.date,
        mealType: slot.mealType,
        status: 'no-recipe',
        deleteExisting: opts.replaceExisting && existing.length > 0,
      });
      continue;
    }

    // Choix aléatoire uniforme (le tri RANDOM est fait en mémoire :
    // la fenêtre antidoublon évolue à chaque insertion du run)
    const recipe = candidates[Math.floor(Math.random() * candidates.length)];

    // Mémoriser le repas généré pour les contrôles suivants du même run
    const dates = plannedDatesByRecipe.get(recipe.id);
    if (dates) dates.push(slot.date);
    else plannedDatesByRecipe.set(recipe.id, [slot.date]);

    outcomes.push({
      date: slot.date,
      mealType: slot.mealType,
      status: 'created',
      deleteExisting: opts.replaceExisting && existing.length > 0,
      recipeId: recipe.id,
      mealCourse: recipe.mealCourse,
    });
  }

  return outcomes;
}
