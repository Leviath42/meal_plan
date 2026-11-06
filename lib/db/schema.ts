// lib/db/schema.ts
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
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
  
  // Type de plat pour l'ordre chronologique (apéritif, entrée, plat, accompagnement, dessert, boisson)
  mealCourse: text("meal_course"),
  
  // Les étapes de préparation. Peut être un long texte avec des sauts de ligne ou du JSON stringifié.
  instructions: text("instructions").notNull(),
  
  // Mots-clés séparés par des virgules pour la recherche (ex: "Végétarien, Rapide, Hiver")
  tags: text("tags"),
  
  // Lien vers un site web ou nom d'un livre papier pour retrouver l'inspiration originale
  source: text("source"),
  // Créateur de la recette (nom/email de l'utilisateur connecté à la création)
  created_by: text("created_by"),
  
  // Date (AAAA-MM-JJ) du repas le plus recent planifie avec cette recette (F08 - historique)
  lastServedAt: text("last_served_at"),
  
  // Date de création et de dernière modification (gérées automatiquement)
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),

  // F17 multi-tenant (vague 4b) : recette du foyer. La colonne reste nullable
  // en base (ALTER SQLite) mais est TOUJOURS posée par le code applicatif ;
  // les lignes préexistantes sont rattachées au foyer principal par le
  // backfill runtime idempotent (lib/household.ts, contrat 4b §1.2).
  householdId: text("household_id"),
});


// ============================================================================
// 2. INGRÉDIENTS (Le dictionnaire de référence)
// ============================================================================
// Ne contient aucune quantité. C'est juste la liste de ce qui existe au supermarché.
export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

  // Nom générique (ex: "Tomate", "Farine T55"). L'UNIQUE global historique
  // devient PAR FOYER (contrat 4b §1.1) : deux foyers peuvent avoir chacun
  // leur "Farine" — la contrainte uniqueIndex en fin de table porte
  // (household_id, name).
  name: text("name").notNull(),
  
  // Crucial pour le supermarché : permet de trier la liste de courses par rayon 
  // (ex: "Fruits & Légumes", "Boucherie", "Épicerie Salée")
  category: text("category").notNull(),
  
  // L'unité classique avec laquelle on achète ce produit (ex: "kg", "pièce", "litre")
  defaultUnit: text("default_unit").notNull(),

  // F17 multi-tenant : catalogue du foyer (nullable en base, backfill runtime)
  householdId: text("household_id"),
}, (table) => [
  // Un même nom d'ingrédient ne peut exister deux fois au sein d'un foyer ;
  // deux foyers peuvent partager le même nom sans collision.
  uniqueIndex('ingredients_household_name_unique').on(table.householdId, table.name),
]);


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

  // F17 multi-tenant : dénormalisation volontaire (contrat 4b §1.1) — les
  // jointures recette↔ingrédient filtrent par foyer sans traverse.
  householdId: text("household_id"),
}, (table) => [
  // Requêtes chaudes : détail/édition de recette, agrégation liste de courses
  index('recipe_ingredients_recipe_idx').on(table.recipeId),
]);


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
  servings: integer("servings").default(4),
  
  // Type de plat pour l'ordre chronologique (hérité de la recette)
  mealCourse: text("meal_course"),
  
  // La recette prévue. "set null" signifie que si on supprime la recette du catalogue,
  // l'événement reste dans le calendrier mais sans la recette associée.
  recipeId: text("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  
  // Timestamps pour le suivi
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),

  // F17 multi-tenant : planning du foyer (nullable en base, backfill runtime)
  householdId: text("household_id"),
}, (table) => [
  // Navigation du calendrier, liste de courses, exports ICS/API :
  // toutes filtrent sur la date
  index('meal_plans_date_idx').on(table.date),
  // Antidoublon F09 : recherche par recette dans une fenêtre de dates
  index('meal_plans_recipe_date_idx').on(table.recipeId, table.date),
  // Un même repas (recette + créneau) ne peut pas être planifié deux fois :
  // évite les doublons de quantités dans la liste de courses. Les repas sans
  // recette (recipe_id NULL) restent multiples (NULL ignoré par UNIQUE).
  // Le créneau unique est PAR FOYER (contrat 4b §1.1).
  // ANTI-DOUBLON: préfixe stable des index chauds date/recette.
  uniqueIndex('meal_plans_slot_household_unique').on(table.householdId, table.date, table.mealType, table.recipeId),
]);


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

  // F17 multi-tenant : liste de courses du foyer (nullable, backfill runtime)
  householdId: text("household_id"),
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
// ============================================================================
// 6. UTILISATEURS (Gestion des comptes)
// ============================================================================
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  password: text("password").notNull(),
  role: text("role", { enum: ["ADMIN", "MEMBER", "GUEST"] })
    .notNull()
    .default("MEMBER"),
  // Question secrète pour réinitialisation de mot de passe
  securityQuestion: text("security_question"),
  // Réponse hashée (avec Argon2) pour plus de sécurité
  securityAnswerHash: text("security_answer_hash"),
  
  // Antidoublon (F09) : interdire de replanifier la meme recette a moins de X jours
  // d'intervalle. 0 = controle desactive. Defaut : 7 jours.
  minDaysBetween: integer("min_days_between").notNull().default(7),
  tokenVersion: integer("token_version").notNull().default(0),
  // F17 multi-tenant (vague 4) : foyer du compte. Null tant que la vague 4b
  // n'a pas fait son backfill ; roles/isolation appliqués par la feature.
  householdId: text("household_id"),
  // F10 notifications : heure locale « HH:MM » du rappel du repas du jour
  // (null = notifications desactivées pour ce compte)
  notifyTime: text("notify_time"),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// ============================================================================
// 7. SESSIONS (Gestion des connexions)
// ============================================================================
export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: text("expires").notNull(),
});

// ============================================================================
// DÉFINITION DES RELATIONS POUR L'AUTHENTIFICATION
// ============================================================================
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));


export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));


// ============================================================================
// 8. JETONS D'ACCÈS PUBLICS (F04 - partage du planning)
// ============================================================================
// Permettent de partager le calendrier en lecture seule (page publique,
// export ICS, API Home Assistant) sans exposer de compte.
export const accessTokens = sqliteTable("access_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

  // Valeur présentée dans l'URL (?token=...), générée côté serveur
  token: text("token").notNull().unique(),

  // Créateur du jeton (ADMIN). "set null" : le jeton survit à la suppression du compte
  createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),

  // 'calendar_read' : page publique + ICS ; 'api' : endpoint JSON (Home Assistant)
  type: text("type", { enum: ["calendar_read", "api"] }).notNull().default("calendar_read"),

  // Date d'expiration au format ISO (7 jours par défaut à la création)
  expiresAt: text("expires_at").notNull(),

  // Null = actif. Renseigné à la révocation
  revokedAt: text("revoked_at"),

  // F17 multi-tenant : le jeton ne sert QUE le planning du foyer (contrat 4b
  // §1.3 — page publique, ICS et JSON Home Assistant filtent par ce foyer)
  householdId: text("household_id"),

  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ============================================================================
// 9. PARAMÈTRES DE L'APPLICATION (F01 options - page de paramétrage)
// ============================================================================
// Une seule ligne (id = 1), partagée par toute la famille.
export const appSettings = sqliteTable("app_settings", {
  id: integer("id").primaryKey().default(1),

  // Nombre de couverts pré-remplis dans le modal de création de repas
  defaultServings: integer("default_servings").notNull().default(4),

  // Palette de couleurs (F14) : id du thème dans lib/themes.ts ('teal' par défaut)
  theme: text("theme").notNull().default('teal'),

  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Relation jeton -> créateur (pour l'interface d'administration)
export const accessTokensRelations = relations(accessTokens, ({ one }) => ({
  createdBy: one(users, {
    fields: [accessTokens.createdByUserId],
    references: [users.id],
  }),
}));

// ============================================================================
// 10. LICENCE PAR FOYER (commercialisation — licence à vie, une instance = un foyer)
// ============================================================================
export const licenses = sqliteTable("licenses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

  // Clé de licence stockée HACHÉE (sha256:...) — jamais en clair en base
  licenseKey: text("license_key").notNull().unique(),

  // active = premium ; suspended = bloquée (remboursement/litige) sans perte de données ; revoked = révoquée définitivement
  status: text("status", { enum: ["active", "suspended", "revoked"] })
    .notNull()
    .default("active"),

  // Traçabilité CGV (art. 19) : version des CGV acceptée à la vente + date de licence
  cgvVersion: text("cgv_version"),
  licensedAt: text("licensed_at"),

  // Lien avec le paiement Stripe (idempotence du webhook)
  stripeSessionId: text("stripe_session_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),

  // Suspension / réactivation (tracées aussi dans license_audit)
  suspendedAt: text("suspended_at"),
  suspensionReason: text("suspension_reason"),
  reactivatedAt: text("reactivated_at"),

  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Journal d'audit des actions sur licence (suspension/réactivation/révocation)
export const licenseAudit = sqliteTable("license_audit", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  licenseId: text("license_id")
    .notNull()
    .references(() => licenses.id, { onDelete: "cascade" }),
  action: text("action", { enum: ["activated", "suspended", "reactivated", "revoked", "refunded"] }).notNull(),
  reason: text("reason"),
  byUserId: text("by_user_id").references(() => users.id, { onDelete: "set null" }),
  at: text("at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ============================================================================
// Vague 4 — households (F17 multi-tenant, contrat vague 4 figé en 0008)
// ============================================================================
export const households = sqliteTable("households", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ============================================================================
// F10 — Notifications du repas du jour (contrat vague 4)
// Abonnements Web Push par utilisateur (VAPID côté serveur, cf. .env.local)
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ============================================================================
// F11 — Garde-manger (contrat vague 4)
// Quantité disponible par ingrédient du catalogue (un foyer = une instance
// jusqu'à F17 ; la clef household sera ajoutée par la migration 4b)
export const pantryItems = sqliteTable("pantry_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ingredientId: text("ingredient_id")
    .notNull()
    .unique()
    .references(() => ingredients.id, { onDelete: "cascade" }),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  // Date de péremption optionnelle, ISO « YYYY-MM-DD »
  expiresAt: text("expires_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),

  // F17 multi-tenant : stock du foyer (nullable, backfill runtime). NB : la
  // contrainte unique reste portée par ingredient_id seul — ingredient_id est
  // désormais propre à un foyer (table ingredients scopée), donc
  // UNIQUE(ingredient_id) est STRICTEMENT PLUS FORT que UNIQUE(household_id,
  // ingredient_id) : même garantie d'isolation, sans casser l'upsert par
  // ingrédient (onConflictDoUpdate, garde-manger et import) — décision C-062.
  householdId: text("household_id"),
});

// ============================================================================
// F15 — Retours clients / feedback (contrat vague 4)
export const feedback = sqliteTable("feedback", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // bug | idee | question | prix
  category: text("category", { enum: ["bug", "idee", "question", "prix"] }).notNull(),
  message: text("message").notNull(),
  pageUrl: text("page_url"),
  appVersion: text("app_version"),
  // nouveau | trie | traite | rejete (statuts de tri admin)
  status: text("status", { enum: ["nouveau", "trie", "traite", "rejete"] })
    .notNull()
    .default("nouveau"),

  // F17 multi-tenant : retour du foyer (spéc F15 §1.1 — admin du foyer seul)
  householdId: text("household_id"),

  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ============================================================================
// F16 — Quantités standard par ingrédient (contrat vague 4)
// « 100 g de pâtes pour 1 personne » : quantity/servingsRef sert de base au
// pré-remplissage des formulaires de recette, ajustable manuellement
export const ingredientStandards = sqliteTable("ingredient_standards", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ingredientId: text("ingredient_id")
    .notNull()
    .unique()
    .references(() => ingredients.id, { onDelete: "cascade" }),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  servingsRef: integer("servings_ref").notNull().default(4),

  // F17 multi-tenant : standard du foyer (nullable, backfill runtime). La
  // contrainte unique reste ingredient_id seul — scopé foyer via ingrédients,
  // même garant strict que (household_id, ingredient_id) (décision C-062).
  householdId: text("household_id"),

  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
