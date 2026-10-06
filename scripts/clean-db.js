const Database = require('better-sqlite3');
const db = new Database('data/sqlite.db');

console.log('🧹 Nettoyage de la base de données...\n');

try {
  // 1. Vérifier et supprimer les doublons dans recipes
  console.log('📋 Vérification des doublons dans les recettes...');
  const recipes = db.prepare('SELECT id, title, COUNT(*) as count FROM recipes GROUP BY title HAVING COUNT(*) > 1').all();
  
  if (recipes.length > 0) {
    console.log(`  ⚠️  ${recipes.length} recettes en double trouvées:`);
    for (const recipe of recipes) {
      console.log(`    - ${recipe.title} (${recipe.count} fois)`);
      
      // Garder la première occurrence, supprimer les autres
      const firstId = db.prepare('SELECT id FROM recipes WHERE title = ? ORDER BY created_at ASC LIMIT 1').get(recipe.title);
      const toDelete = db.prepare('SELECT id FROM recipes WHERE title = ? AND id != ?').all(recipe.title, firstId.id);
      
      for (const dup of toDelete) {
        // Supprimer aussi les associations de la table recipe_ingredients
        db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(dup.id);
        db.prepare('DELETE FROM meal_plans WHERE recipe_id = ?').run(dup.id);
        db.prepare('DELETE FROM recipes WHERE id = ?').run(dup.id);
        console.log(`      ✓ Suppression du doublon: ${dup.id}`);
      }
    }
  } else {
    console.log('  ✅ Aucune recette en double');
  }

  // 2. Vérifier et supprimer les doublons dans meal_plans (même date + même meal_type + même recipe_id)
  console.log('\n🍽️ Vérification des doublons dans les repas planifiés...');
  const mealPlans = db.prepare(`
    SELECT date, meal_type, recipe_id, COUNT(*) as count 
    FROM meal_plans 
    WHERE recipe_id IS NOT NULL
    GROUP BY date, meal_type, recipe_id 
    HAVING COUNT(*) > 1
  `).all();
  
  if (mealPlans.length > 0) {
    console.log(`  ⚠️  ${mealPlans.length} repas planifiés en double trouvés:`);
    for (const plan of mealPlans) {
      console.log(`    - ${plan.date} ${plan.meal_type} ${plan.recipe_id} (${plan.count} fois)`);
      
      // Garder la première occurrence, supprimer les autres
      const firstId = db.prepare(`
        SELECT id FROM meal_plans 
        WHERE date = ? AND meal_type = ? AND recipe_id = ? 
        ORDER BY created_at ASC LIMIT 1
      `).get(plan.date, plan.meal_type, plan.recipe_id);
      
      const toDelete = db.prepare(`
        SELECT id FROM meal_plans 
        WHERE date = ? AND meal_type = ? AND recipe_id = ? AND id != ?
      `).all(plan.date, plan.meal_type, plan.recipe_id, firstId.id);
      
      for (const dup of toDelete) {
        db.prepare('DELETE FROM meal_plans WHERE id = ?').run(dup.id);
        console.log(`      ✓ Suppression du doublon: ${dup.id}`);
      }
    }
  } else {
    console.log('  ✅ Aucun repas planifié en double');
  }

  // 3. Mettre à jour mealCourse pour les recettes existantes
  console.log('\n🎨 Mise à jour des mealCourse pour les recettes...');
  
  // Mapping des recettes par titre vers mealCourse
  const mealCourseMapping = {
    // Plats principaux
    'Lasagnes bolognaise': 'plat',
    'Lasagnes maison': 'plat',
    'Pizza Margherita': 'plat',
    'Pizza': 'plat',
    'Crozet a la margoulène': 'plat',
    'Pâtes Carbonara': 'plat',
    'Risotto champignons': 'plat',
    'Poulet rôti': 'plat',
    'Jambon Pâtes': 'plat',
    'Spaghetti bolognaise': 'plat',
    'Pâtes champignons crème': 'plat',
    'Paella valencienne': 'plat',
    'Boeuf aux carottes': 'plat',
    'Pot-au-feu': 'plat',
    'Cassoulet': 'plat',
    'Saucisses lentilles': 'plat',
    'Poulet à la crème': 'plat',
    'Agneau aux flageolets': 'plat',
    'Magret de canard à l\'orange': 'plat',
    'Palourdes à la marinière': 'plat',
    'Quiche lorraine': 'plat',
    'Tartiflette': 'plat',
    'Tarte au fromage': 'plat',
    'Pâtes aux anchois et olives': 'plat',
    'Chorizo grillé aux pommes': 'plat',
    'Brouillade aux champignons': 'plat',
    
    // Entrées
    'Calamars à l\'ail': 'entrée',
    'Soupe à l\'oignon': 'entrée',
    'Soupe de légumes': 'entrée',
    'Fromage de chèvre chaud': 'entrée',
    
    // Accompagnements
    'Ratatouille': 'accompagnement',
    'Gratin dauphinois': 'accompagnement',
    'Purée de potiron': 'accompagnement',
    
    // Desserts
    'Tiramisu': 'dessert',
    'Crème brûlée': 'dessert',
    'Tarte aux pommes': 'dessert',
    'Mousse au chocolat': 'dessert',
    'Clafoutis aux cerises': 'dessert',
    'Poire pochée au vin rouge': 'dessert',
  };

  let updatedCount = 0;
  for (const [title, mealCourse] of Object.entries(mealCourseMapping)) {
    const result = db.prepare('UPDATE recipes SET meal_course = ? WHERE title = ?').run(mealCourse, title);
    if (result.changes > 0) {
      updatedCount += result.changes;
      console.log(`  ✓ ${title} → ${mealCourse}`);
    }
  }
  console.log(`  ✅ ${updatedCount} recettes mises à jour`);

  // 4. Mettre à jour mealCourse dans meal_plans (hérité de la recette)
  console.log('\n📅 Mise à jour des mealCourse dans les repas planifiés...');
  const updatePlans = db.prepare(`
    UPDATE meal_plans 
    SET meal_course = (
      SELECT r.meal_course 
      FROM recipes r 
      WHERE r.id = meal_plans.recipe_id
    )
    WHERE recipe_id IS NOT NULL AND meal_course IS NULL
  `).run();
  console.log(`  ✅ ${updatePlans.changes} repas planifiés mis à jour`);

  console.log('\n🎉 Nettoyage terminé !');
  
  // Stats finales
  const stats = {
    recipes: db.prepare('SELECT COUNT(*) as count FROM recipes').get().count,
    ingredients: db.prepare('SELECT COUNT(*) as count FROM ingredients').get().count,
    mealPlans: db.prepare('SELECT COUNT(*) as count FROM meal_plans').get().count,
    recipesWithCourse: db.prepare('SELECT COUNT(*) as count FROM recipes WHERE meal_course IS NOT NULL').get().count,
    mealPlansWithCourse: db.prepare('SELECT COUNT(*) as count FROM meal_plans WHERE meal_course IS NOT NULL').get().count,
  };
  
  console.log('\n📊 Statistiques:');
  console.log(`  - Recettes: ${stats.recipes} (${stats.recipesWithCourse} avec mealCourse)`);
  console.log(`  - Ingrédients: ${stats.ingredients}`);
  console.log(`  - Repas planifiés: ${stats.mealPlans} (${stats.mealPlansWithCourse} avec mealCourse)`);

} catch (error) {
  console.error('❌ Erreur:', error.message);
} finally {
  db.close();
}
