// lib/db/schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ============================================================================
// 1. RECETTES (Le catalogue des plats)
// ============================================================================
export const recipes = sqliteTable("recipes", {
  // Identifiant unique généré automatiquement (format UUID)
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // Nom du plat affiché dans l'interface (ex: "Lasagnes Maison")
  title: text("title").notNull(),
  
  // Petite note perso ou description de présentation (ex: "La recette de Mamie")
  description: text("description"),
  
  // Temps passé activement en cuisine, en minutes (ex: 20)
  prepTime: integer("prep_time").notNull(),
  
  // Temps où le plat cuit tout seul, en minutes (ex: 45)
  cookTime: integer("cook_time").notNull(),
  
  // Base de calcul pour les courses. Par défaut 3 (pour toi, ta femme, ta fille). 
  // Si la recette originale est pour 4, on met 4 ici pour que le calcul des courses soit juste.
  defaultServings: integer("default_servings").notNull().default(3),
  
  // Les étapes de préparation. Peut être un long texte avec des sauts de ligne ou du JSON stringifié.
  instructions: text("instructions").notNull(),
  
  // Mots-clés séparés par des virgules pour la recherche (ex: "Végétarien, Rapide, Hiver")
  tags: text("tags"),
  
  // Lien vers un site web ou nom d'un livre papier pour retrouver l'inspiration originale
  source: text("source"),
  
  // Date de création et de dernière modification (gérées automatiquement)
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});


// ============================================================================
// 2. INGRÉDIENTS (Le dictionnaire de référence)
// ============================================================================
// Ne contient aucune quantité. C'est juste la liste de ce qui existe au supermarché.
export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // Nom générique (ex: "Tomate", "Farine T55"). Unique pour éviter les doublons.
  name: text("name").notNull().unique(),
  
  // Crucial pour le supermarché : permet de trier la liste de courses par rayon 
  // (ex: "Fruits & Légumes", "Boucherie", "Épicerie Salée")
  category: text("category").notNull(),
  
  // L'unité classique avec laquelle on achète ce produit (ex: "kg", "pièce", "litre")
  defaultUnit: text("default_unit").notNull(),
});


// ============================================================================
// 3. RECETTE <-> INGRÉDIENTS (La table de liaison)
// ============================================================================
// Répond à la question : "Dans la recette X, combien faut-il de l'ingrédient Y ?"
export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // La quantité nécessaire pour la recette (ex: 2.5)
  quantity: real("quantity").notNull(),
  
  // L'unité spécifique à la préparation (ex: "cuillère à soupe", "pincée", "g")
  unit: text("unit").notNull(),
  
  // Précision pour la cuisine (ex: "coupé en dés", "fondu", "émincé")
  note: text("note"),
  
  // Lien vers la recette. "cascade" signifie que si on supprime la recette, 
  // tous ses ingrédients associés sont supprimés automatiquement de cette table.
  recipeId: text("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  
  // Lien vers le dictionnaire d'ingrédients
  ingredientId: text("ingredient_id").notNull().references(() => ingredients.id),
});


// ============================================================================
// 4. PLANIFICATEUR DE REPAS (Le calendrier familial)
// ============================================================================
export const mealPlans = sqliteTable("meal_plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // Le jour prévu pour ce repas. Format ISO "YYYY-MM-DD" (ex: "2026-10-05")
  date: text("date").notNull(), 
  
  // Moment du repas (ex: "Midi", "Soir", "Petit-déjeuner")
  mealType: text("meal_type").notNull(),
  
  // Permet de planifier quelque chose sans recette précise (ex: "Soirée Crêpes", "Macdo")
  customNote: text("custom_note"),
  
  // Surcharge le "defaultServings" de la recette si on a des invités ce jour-là.
  // La liste de courses utilisera ce chiffre pour recalculer les quantités.
  servings: integer("servings"),
  
  // La recette prévue. "set null" signifie que si on supprime la recette du catalogue,
  // l'événement reste dans le calendrier mais sans la recette associée.
  recipeId: text("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
});


// ============================================================================
// 5. LISTE DE COURSES (Les articles à acheter)
// ============================================================================
export const shoppingItems = sqliteTable("shopping_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // La quantité totale calculée pour la semaine ou saisie manuellement
  quantity: real("quantity").notNull(),
  
  // L'unité (ex: "pièces", "kg")
  unit: text("unit").notNull(),
  
  // Booléen coché/décoché quand on est dans les rayons du supermarché
  isBought: integer("is_bought", { mode: "boolean" }).notNull().default(false),
  
  // Permet de différencier les ingrédients générés par les recettes 
  // des trucs rajoutés à la main (ex: "Papier toilette", "Piles")
  addedManually: integer("added_manually", { mode: "boolean" }).notNull().default(false),
  
  // Le nom de l'article si ce n'est pas un ingrédient alimentaire (pour les ajouts manuels)
  manualName: text("manual_name"),
  
  // Lien vers l'ingrédient de référence (pour récupérer son nom et sa catégorie de rayon)
  // Peut être vide si c'est un article ajouté manuellement (addedManually = true)
  ingredientId: text("ingredient_id").references(() => ingredients.id),
});


// ============================================================================
// DÉFINITION DES RELATIONS (Pour faciliter les requêtes complexes de Drizzle)
// ============================================================================
export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(recipeIngredients), // Une recette a plusieurs ingrédients
  mealPlans: many(mealPlans),           // Une recette peut être planifiée plusieurs fois
}));

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  recipes: many(recipeIngredients),     // Un ingrédient appartient à plusieurs recettes
  shoppingItems: many(shoppingItems),   // Un ingrédient peut apparaître dans la liste de courses
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
  ingredient: one(ingredients, {
    fields: [recipeIngredients.ingredientId],
    references: [ingredients.id],
  }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one }) => ({
  recipe: one(recipes, {
    fields: [mealPlans.recipeId],
    references: [recipes.id],
  }),
}));