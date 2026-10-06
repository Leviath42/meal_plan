const fs = require('fs');

// Lire le contenu actuel
let content = fs.readFileSync('lib/db/seed.ts', 'utf8');

// Mapping complet de toutes les recettes avec leur mealCourse
const mealCourseMap = {
  // Plats principaux
  'Lasagnes bolognaise': 'plat',
  'Pizza Margherita': 'plat',
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
  'Soupe de légumes': 'entrée',
  
  // Entrées
  'Calamars à l\'ail': 'entrée',
  'Soupe à l\'oignon': 'entrée',
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
  'Poire pochée au vin rouge': 'dessert'
};

// Trouver toutes les recettes avec une regex plus robuste
// Matcher chaque objet recette (de { à } avec title dedans)
const recipeRegex = /({\s*[\s\S]*?title:\s*'([^']+)'[\s\S]*?})/g;

let match;
const recipes = [];
while ((match = recipeRegex.exec(content)) !== null) {
  recipes.push({ full: match[1], title: match[2] });
}

console.log(`📋 Trouvé ${recipes.length} recettes à vérifier...\n`);

// Mettre à jour chaque recette
let updatedCount = 0;
let newContent = content;

for (const recipe of recipes) {
  const title = recipe.title;
  const mealCourse = mealCourseMap[title];
  
  if (mealCourse && !recipe.full.includes('mealCourse:')) {
    // Trouver la position après source ou tags
    let insertPos = -1;
    
    // Chercher source:
    const sourceMatch = recipe.full.match(/(source:\s*'[^']*',)\s*/);
    if (sourceMatch) {
      insertPos = recipe.full.indexOf(sourceMatch[1]) + sourceMatch[1].length;
    }
    // Sinon chercher tags:
    else {
      const tagsMatch = recipe.full.match(/(tags:\s*'[^']*',)\s*/);
      if (tagsMatch) {
        insertPos = recipe.full.indexOf(tagsMatch[1]) + tagsMatch[1].length;
      }
    }
    
    if (insertPos > 0) {
      // Insérer mealCourse avant le prochain champ (qui commence par \n    + 2 espaces)
      const before = recipe.full.substring(0, insertPos);
      const after = recipe.full.substring(insertPos);
      const updatedRecipe = before + `\n    mealCourse: '${mealCourse}',` + after;
      
      newContent = newContent.replace(recipe.full, updatedRecipe);
      updatedCount++;
      console.log(`✓ ${title} → ${mealCourse}`);
    }
  }
}

// Écrire le fichier
if (updatedCount > 0) {
  fs.writeFileSync('lib/db/seed.ts', newContent);
  console.log(`\n✅ ${updatedCount} recettes mises à jour avec mealCourse`);
} else {
  console.log('\n⚠️ Aucune recette à mettre à jour (déjà à jour ou mapping incomplet)');
}
