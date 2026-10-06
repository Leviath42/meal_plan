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
  'Soupe de légumes': 'entrée',
  'Tarte au fromage': 'plat',
  'Pâtes aux anchois et olives': 'plat',
  'Chorizo grillé aux pommes': 'plat',
  'Brouillade aux champignons': 'plat',
  
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

// Trouver la section recipesData
const recipesStart = content.indexOf('const recipesData = [');
const recipesEnd = content.lastIndexOf('];', content.indexOf('// Recettes') + 1000);

if (recipesStart === -1 || recipesEnd === -1) {
  console.error('❌ Impossible de trouver la section recipesData');
  process.exit(1);
}

// Extraire la section recipesData
const beforeRecipes = content.substring(0, recipesStart + 'const recipesData = ['.length);
const afterRecipes = content.substring(recipesEnd);

// Extraire les recettes individuelles
const recipesSection = content.substring(recipesStart + 'const recipesData = ['.length, recipesEnd);

// Parser les recettes (approche simple : compter les accolades)
let recipes = [];
let currentRecipe = '';
let braceCount = 0;
let inRecipe = false;

for (let i = 0; i < recipesSection.length; i++) {
  const char = recipesSection[i];
  
  if (char === '{') {
    braceCount++;
    inRecipe = true;
  }
  
  if (inRecipe) {
    currentRecipe += char;
  }
  
  if (char === '}') {
    braceCount--;
    if (braceCount === 0) {
      currentRecipe += char;
      recipes.push(currentRecipe);
      currentRecipe = '';
      inRecipe = false;
    }
  }
}

console.log(`📋 Trouvé ${recipes.length} recettes à mettre à jour...\n`);

// Mettre à jour chaque recette avec mealCourse
let updatedCount = 0;
const updatedRecipes = recipes.map(recipeStr => {
  // Extraire le title
  const titleMatch = recipeStr.match(/title:\s*'([^']+)'/);
  if (!titleMatch) return recipeStr;
  
  const title = titleMatch[1];
  const mealCourse = mealCourseMap[title];
  
  if (mealCourse && !recipeStr.includes('mealCourse:')) {
    // Ajouter mealCourse après source ou après tags si source n'existe pas
    if (recipeStr.includes('source:')) {
      // Remplacer source: 'X', par source: 'X',\n    mealCourse: 'Y',
      const updated = recipeStr.replace(
        /(source:\s*'[^']*',)\n(\s+instructions:)/,
        `$1\n    mealCourse: '${mealCourse}',\n$2`
      );
      updatedCount++;
      console.log(`✓ ${title} → ${mealCourse}`);
      return updated;
    } else if (recipeStr.includes('tags:')) {
      // Remplacer tags: 'X', par tags: 'X',\n    mealCourse: 'Y',
      const updated = recipeStr.replace(
        /(tags:\s*'[^']*',)\n(\s+instructions:)/,
        `$1\n    mealCourse: '${mealCourse}',\n$2`
      );
      updatedCount++;
      console.log(`✓ ${title} → ${mealCourse}`);
      return updated;
    }
  }
  
  return recipeStr;
});

// Reconstruire le contenu
const newRecipesSection = updatedRecipes.join(',\n  ');
const newContent = beforeRecipes + newRecipesSection + afterRecipes;

// Écrire le fichier
fs.writeFileSync('lib/db/seed.ts', newContent);
console.log(`\n✅ ${updatedCount} recettes mises à jour avec mealCourse`);
console.log('Seed mis à jour avec succès !');
