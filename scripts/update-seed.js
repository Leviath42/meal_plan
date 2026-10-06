const fs = require('fs');

// Lire le contenu du seed
let content = fs.readFileSync('lib/db/seed.ts', 'utf8');

// Mapping des recettes par titre vers mealCourse
const mealCourseMap = {
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
  'Calamars à l\'ail': 'entrée',
  'Palourdes à la marinière': 'plat',
  'Ratatouille': 'accompagnement',
  'Soupe à l\'oignon': 'entrée',
  'Gratin dauphinois': 'accompagnement',
  'Quiche lorraine': 'plat',
  'Tartiflette': 'plat',
  'Soupe de légumes': 'entrée',
  'Purée de potiron': 'accompagnement',
  'Tiramisu': 'dessert',
  'Crème brûlée': 'dessert',
  'Tarte aux pommes': 'dessert',
  'Mousse au chocolat': 'dessert',
  'Clafoutis aux cerises': 'dessert',
  'Poire pochée au vin rouge': 'dessert',
  'Fromage de chèvre chaud': 'entrée',
  'Tarte au fromage': 'plat',
  'Pâtes aux anchois et olives': 'plat',
  'Chorizo grillé aux pommes': 'plat',
  'Brouillade aux champignons': 'plat'
};

let updatedCount = 0;

// Pour chaque recette dans le mapping
for (const [title, mealCourse] of Object.entries(mealCourseMap)) {
  // Trouver la ligne avec ce titre
  const titleRegex = new RegExp(`('${title.replace(/'/g, "\\'")}')`);
  
  // Vérifier si mealCourse est déjà présent pour cette recette
  const hasMealCourse = content.includes(`title: '${title}'`) && 
                        content.includes(`mealCourse: '${mealCourse}'`);
  
  if (!hasMealCourse) {
    // Remplacer title: 'X', par title: 'X',\n    mealCourse: 'Y',
    const regex = new RegExp(`(title: '\${title.replace(/'/g, "\\'")}',)\n(\s+description:)`, 'g');
    const replacement = `$1\n    mealCourse: '${mealCourse}',\n$2`;
    const newContent = content.replace(regex, replacement);
    
    if (newContent !== content) {
      content = newContent;
      updatedCount++;
      console.log(`✓ Ajout mealCourse: ${title} → ${mealCourse}`);
    }
  }
}

console.log(`\n✅ ${updatedCount} recettes mises à jour dans seed.ts`);

// Écrire le fichier mis à jour
fs.writeFileSync('lib/db/seed.ts', content);
console.log('Seed mis à jour avec succès !');
