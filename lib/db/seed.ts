import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

// Connexion directe à la base de données (pas le singleton)
const sqlite = new Database('data/sqlite.db');
const db = drizzle(sqlite, { schema });

// Références pour la clarté
const { recipes, ingredients, recipeIngredients } = schema;

// Catégories d'ingrédients
const CATEGORIES = {
  fruitsLegumes: 'Fruits & Légumes',
  viandes: 'Boucherie/Volaille',
  poissons: 'Poissonnerie',
  epicerieSalee: 'Épicerie Salée',
  epicerieSucree: 'Épicerie Sucrée',
  produitsLaitiers: 'Produits Laitiers',
  boissons: 'Boissons',
  conserve: 'Conserves',
  condiments: 'Condiments & Sauces',
  matieresGrasses: 'Matières Grasses',
  boulangerie: 'Boulangerie',
} as const;

// Ingrédients
const seedIngredients = [
  { name: 'Tomate', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Oignon', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Ail', category: CATEGORIES.fruitsLegumes, defaultUnit: 'gousse' },
  { name: 'Carotte', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Pomme de terre', category: CATEGORIES.fruitsLegumes, defaultUnit: 'kg' },
  { name: 'Courgette', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Poivron', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Salade', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pied' },
  { name: 'Champignons', category: CATEGORIES.fruitsLegumes, defaultUnit: 'g' },
  { name: 'Brocoli', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Pomme', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Citron', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Oignon rouge', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Blanc de poulet', category: CATEGORIES.viandes, defaultUnit: 'filet' },
  { name: 'Viande hachée', category: CATEGORIES.viandes, defaultUnit: 'g' },
  { name: 'Lardons fumés', category: CATEGORIES.viandes, defaultUnit: 'g' },
  { name: 'Jambon blanc', category: CATEGORIES.viandes, defaultUnit: 'tranches' },
  { name: 'Pâtes alimentaires', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Pâtes à lasagnes', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Riz basmati', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Farine', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Sucre', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Fromage râpé', category: CATEGORIES.produitsLaitiers, defaultUnit: 'g' },
  { name: 'Crème fraîche', category: CATEGORIES.produitsLaitiers, defaultUnit: 'pot' },
  { name: 'Lait', category: CATEGORIES.produitsLaitiers, defaultUnit: 'L' },
  { name: 'Beurre', category: CATEGORIES.produitsLaitiers, defaultUnit: 'g' },
  { name: 'Œufs', category: CATEGORIES.epicerieSalee, defaultUnit: 'pièce' },
  { name: 'Parmesan', category: CATEGORIES.produitsLaitiers, defaultUnit: 'g' },
  { name: 'Mozzarella', category: CATEGORIES.produitsLaitiers, defaultUnit: 'boule' },
  { name: 'Pain de mie', category: CATEGORIES.boulangerie, defaultUnit: 'pièce' },
  { name: 'Sauce tomate', category: CATEGORIES.condiments, defaultUnit: 'bouteille' },
  { name: 'Huile d\'olive', category: CATEGORIES.matieresGrasses, defaultUnit: 'L' },
  { name: 'Tomates pelées', category: CATEGORIES.conserve, defaultUnit: 'boîte' },
  { name: 'Bouillon cube', category: CATEGORIES.epicerieSalee, defaultUnit: 'pièce' },
  { name: 'Concentré de tomate', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  // Nouveaux ingrédients pour les 30 recettes supplémentaires
  { name: 'Pâtes courtes', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Jambon cru', category: CATEGORIES.viandes, defaultUnit: 'tranches' },
  { name: 'Saucisse fumée', category: CATEGORIES.viandes, defaultUnit: 'pièce' },
  { name: 'Agneau', category: CATEGORIES.viandes, defaultUnit: 'kg' },
  { name: 'Porc', category: CATEGORIES.viandes, defaultUnit: 'kg' },
  { name: 'Coq', category: CATEGORIES.viandes, defaultUnit: 'pièce' },
  { name: 'Poitrine fumée', category: CATEGORIES.viandes, defaultUnit: 'g' },
  { name: 'Haricots blancs', category: CATEGORIES.conserve, defaultUnit: 'boîte' },
  { name: 'Haricots rouges', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Pois cassés', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Poireau', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Courge', category: CATEGORIES.fruitsLegumes, defaultUnit: 'kg' },
  { name: 'Potiron', category: CATEGORIES.fruitsLegumes, defaultUnit: 'kg' },
  { name: 'Navet', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Poire', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Cerise', category: CATEGORIES.fruitsLegumes, defaultUnit: 'g' },
  { name: 'Fraise', category: CATEGORIES.fruitsLegumes, defaultUnit: 'g' },
  { name: 'Abricot', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Pêche', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Citron vert', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Gousse de vanille', category: CATEGORIES.epicerieSucree, defaultUnit: 'pièce' },
  { name: 'Chocolat blanc', category: CATEGORIES.epicerieSucree, defaultUnit: 'tablette' },
  { name: 'Sel', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Crème fleurette', category: CATEGORIES.produitsLaitiers, defaultUnit: 'L' },
  { name: 'Mascarpone', category: CATEGORIES.produitsLaitiers, defaultUnit: 'pot' },
  { name: 'Fromage de chèvre', category: CATEGORIES.produitsLaitiers, defaultUnit: 'bûche' },
  { name: 'Crème chantilly', category: CATEGORIES.produitsLaitiers, defaultUnit: 'bombe' },
  { name: 'Biscuits cuillère', category: CATEGORIES.epicerieSucree, defaultUnit: 'paquet' },
  { name: 'Amande en poudre', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Noix', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Raisin sec', category: CATEGORIES.epicerieSucree, defaultUnit: 'g' },
  { name: 'Chorizo', category: CATEGORIES.viandes, defaultUnit: 'pièce' },
  { name: 'Calamar', category: CATEGORIES.poissons, defaultUnit: 'g' },
  { name: 'Palourde', category: CATEGORIES.poissons, defaultUnit: 'kg' },
  { name: 'Anchois en boîte', category: CATEGORIES.poissons, defaultUnit: 'boîte' },
  { name: 'Olives noires', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Olives vertes', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Câpres', category: CATEGORIES.condiments, defaultUnit: 'g' },
  { name: 'Cornichons', category: CATEGORIES.condiments, defaultUnit: 'g' },
  { name: 'Vinaigre balsamique', category: CATEGORIES.condiments, defaultUnit: 'bouteille' },
  { name: 'Saucisse de Strasbourg', category: CATEGORIES.viandes, defaultUnit: 'pièce' },
  { name: 'Chou vert', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Céleri', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Échalote', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Thym frais', category: CATEGORIES.fruitsLegumes, defaultUnit: 'branche' },
  { name: 'Romarin', category: CATEGORIES.fruitsLegumes, defaultUnit: 'branche' },
  { name: 'Laurier', category: CATEGORIES.epicerieSalee, defaultUnit: 'feuille' },
  { name: 'Vin rouge', category: CATEGORIES.boissons, defaultUnit: 'bouteille' },
  { name: 'Bière', category: CATEGORIES.boissons, defaultUnit: 'bouteille' },
  { name: 'Cidre', category: CATEGORIES.boissons, defaultUnit: 'bouteille' },
  { name: 'Café', category: CATEGORIES.boissons, defaultUnit: 'g' },
  { name: 'Champagne', category: CATEGORIES.boissons, defaultUnit: 'bouteille' },
  { name: 'Jus de pomme', category: CATEGORIES.boissons, defaultUnit: 'L' },
  { name: 'Orange', category: CATEGORIES.fruitsLegumes, defaultUnit: 'pièce' },
  { name: 'Pâte feuilletée', category: CATEGORIES.epicerieSalee, defaultUnit: 'pièce' },
  { name: 'Pâte à tarte', category: CATEGORIES.epicerieSalee, defaultUnit: 'pièce' },
  { name: 'Feuilles de brick', category: CATEGORIES.epicerieSalee, defaultUnit: 'paquet' },
  { name: 'Fromage à tartiflette', category: CATEGORIES.produitsLaitiers, defaultUnit: 'g' },
  { name: 'Foie gras', category: CATEGORIES.epicerieSalee, defaultUnit: 'tranches' },
  { name: 'Magret de canard', category: CATEGORIES.viandes, defaultUnit: 'pièce' },
  { name: 'Persil frais', category: CATEGORIES.fruitsLegumes, defaultUnit: 'bouquet' },
  { name: 'Miel', category: CATEGORIES.epicerieSucree, defaultUnit: 'g' },
  { name: 'Cannelle', category: CATEGORIES.epicerieSucree, defaultUnit: 'g' },
  { name: 'Vin blanc', category: CATEGORIES.boissons, defaultUnit: 'bouteille' },
  { name: 'Bouquet garni', category: CATEGORIES.epicerieSalee, defaultUnit: 'pièce' },
  { name: 'Safran', category: CATEGORIES.epicerieSalee, defaultUnit: 'pincée' },
  { name: 'Piment doux', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
  { name: 'Chocolat noir', category: CATEGORIES.epicerieSucree, defaultUnit: 'tablette' },
  { name: 'Cacao en poudre', category: CATEGORIES.epicerieSucree, defaultUnit: 'g' },
  { name: 'Café soluble', category: CATEGORIES.boissons, defaultUnit: 'g' },
  { name: 'Noix de muscade', category: CATEGORIES.epicerieSalee, defaultUnit: 'g' },
];

// Recettes
const recipesData = [
  {
    title: 'Lasagnes bolognaise',
    description: 'Lasagnes classiques avec sauce tomate et bolognaise',
    prepTime: 45,
    cookTime: 45,
    defaultServings: 4,
    tags: 'Viande,Pâtes,Classique',
    source: 'Famille',
    mealCourse: 'plat',
    instructions: '1. Faire revenir oignons, ail, carottes et viande. 2. Ajouter tomates pelées et concentré. 3. Alterner pâtes, sauce, béchamel, fromage. 4. Cuire 45 min à 180°C.',
    ingredients: [
      { name: 'Pâtes à lasagnes', quantity: 500, unit: 'g' },
      { name: 'Viande hachée', quantity: 600, unit: 'g' },
      { name: 'Oignon', quantity: 2, unit: 'pièce' },
      { name: 'Ail', quantity: 2, unit: 'gousse' },
      { name: 'Carotte', quantity: 1, unit: 'pièce' },
      { name: 'Tomates pelées', quantity: 400, unit: 'g' },
      { name: 'Concentré de tomate', quantity: 70, unit: 'g' },
      { name: 'Lait', quantity: 500, unit: 'ml' },
      { name: 'Farine', quantity: 40, unit: 'g' },
      { name: 'Beurre', quantity: 50, unit: 'g' },
      { name: 'Fromage râpé', quantity: 200, unit: 'g' },
    ],
  },
  {
    title: 'Pizza Margherita',
    description: 'Pizza classique italienne',
    prepTime: 20,
    cookTime: 15,
    defaultServings: 2,
    tags: 'Italien,Végétarien,Pizza',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Étaler pâte. 2. Sauce tomate. 3. Mozzarella. 4. Basilic. 5. Cuire 15 min à 240°C.',
    ingredients: [
      { name: 'Pain de mie', quantity: 1, unit: 'pièce' },
      { name: 'Sauce tomate', quantity: 100, unit: 'g' },
      { name: 'Fromage râpé', quantity: 100, unit: 'g' },
      { name: 'Huile d\'olive', quantity: 10, unit: 'ml' },
    ],
  },
  {
    title: 'Pâtes Carbonara',
    description: 'Pâtes crémeuses aux lardons',
    prepTime: 15,
    cookTime: 15,
    defaultServings: 3,
    tags: 'Italien,Rapide,Pâtes',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Cuire pâtes. 2. Mélanger œufs, crème, parmesan. 3. Faire revenir lardons. 4. Mélanger le tout.',
    ingredients: [
      { name: 'Pâtes alimentaires', quantity: 300, unit: 'g' },
      { name: 'Lardons fumés', quantity: 200, unit: 'g' },
      { name: 'Œufs', quantity: 2, unit: 'pièce' },
      { name: 'Crème fraîche', quantity: 100, unit: 'ml' },
      { name: 'Parmesan', quantity: 80, unit: 'g' },
    ],
  },
  {
    title: 'Risotto champignons',
    description: 'Risotto crémeux aux champignons',
    prepTime: 20,
    cookTime: 30,
    defaultServings: 4,
    tags: 'Italien,Végétarien,Riz',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Faire revenir oignon, ail. 2. Ajouter riz. 3. Vin blanc. 4. Bouillon petit à petit. 5. Champignons après 15 min.',
    ingredients: [
      { name: 'Riz basmati', quantity: 320, unit: 'g' },
      { name: 'Champignons', quantity: 300, unit: 'g' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Ail', quantity: 2, unit: 'gousse' },
      { name: 'Bouillon cube', quantity: 1, unit: 'pièce' },
      { name: 'Beurre', quantity: 30, unit: 'g' },
      { name: 'Fromage râpé', quantity: 80, unit: 'g' },
    ],
  },
  {
    title: 'Poulet rôti',
    description: 'Poulet rôti aux herbes',
    prepTime: 20,
    cookTime: 90,
    defaultServings: 4,
    tags: 'Viande,Rôti,Classique',
    source: 'Famille',
    mealCourse: 'plat',
    instructions: '1. Préchauffer four à 180°C. 2. Beurre + herbes sous la peau. 3. Cuire 1h30.',
    ingredients: [
      { name: 'Blanc de poulet', quantity: 4, unit: 'filet' },
      { name: 'Pomme de terre', quantity: 1, unit: 'kg' },
      { name: 'Beurre', quantity: 100, unit: 'g' },
    ],
  },
  // Nouvelles recettes supplémentaires
  {
    title: 'Jambon Pâtes',
    description: 'Pâtes courtes avec jambon blanc et crème fraîche, un classique familial',
    prepTime: 10,
    cookTime: 12,
    defaultServings: 4,
    tags: 'Rapide,Pâtes,Enfants',
    source: 'Famille',
    mealCourse: 'plat',
    instructions: '1. Cuire les pâtes dans l\'eau bouillante salée. 2. Pendant ce temps, couper le jambon en dés. 3. Égoutter les pâtes, ajouter la crème fraîche, le jambon et le parmesan. 4. Bien mélanger et servir chaud.',
    ingredients: [
      { name: 'Pâtes courtes', quantity: 400, unit: 'g' },
      { name: 'Jambon blanc', quantity: 200, unit: 'g' },
      { name: 'Crème fraîche', quantity: 200, unit: 'ml' },
      { name: 'Parmesan', quantity: 60, unit: 'g' },
      { name: 'Beurre', quantity: 20, unit: 'g' },
    ],
  },
  {
    title: 'Spaghetti bolognaise',
    description: 'Spaghettis avec une sauce bolognaise riche et savoureuse',
    prepTime: 20,
    cookTime: 45,
    defaultServings: 4,
    tags: 'Italien,Viande,Pâtes,Classique',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Faire revenir oignon, ail et carotte hachés. 2. Ajouter la viande hachée et bien la faire dorer. 3. Incorporer les tomates pelées, le concentré et le bouillon cube. 4. Laisser mijoter 30 min. 5. Cuire les pâtes séparément et mélanger avec la sauce.',
    ingredients: [
      { name: 'Pâtes alimentaires', quantity: 400, unit: 'g' },
      { name: 'Viande hachée', quantity: 500, unit: 'g' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Ail', quantity: 2, unit: 'gousse' },
      { name: 'Carotte', quantity: 2, unit: 'pièce' },
      { name: 'Tomates pelées', quantity: 500, unit: 'g' },
      { name: 'Concentré de tomate', quantity: 70, unit: 'g' },
      { name: 'Bouillon cube', quantity: 1, unit: 'pièce' },
      { name: 'Huile d\'olive', quantity: 20, unit: 'ml' },
      { name: 'Parmesan', quantity: 50, unit: 'g' },
    ],
  },
  {
    title: 'Pâtes champignons crème',
    description: 'Pâtes avec champignons frais et sauce crémeuse',
    prepTime: 15,
    cookTime: 15,
    defaultServings: 3,
    tags: 'Rapide,Végétarien,Pâtes',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Cuire les pâtes. 2. Faire revenir échalote et champignons dans le beurre. 3. Ajouter la crème fraîche et le persil. 4. Mélanger avec les pâtes égouttées.',
    ingredients: [
      { name: 'Pâtes alimentaires', quantity: 300, unit: 'g' },
      { name: 'Champignons', quantity: 300, unit: 'g' },
      { name: 'Crème fraîche', quantity: 200, unit: 'ml' },
      { name: 'Échalote', quantity: 1, unit: 'pièce' },
      { name: 'Beurre', quantity: 30, unit: 'g' },
      { name: 'Persil frais', quantity: 1, unit: 'bouquet' },
    ],
  },
  {
    title: 'Paella valencienne',
    description: 'Paella traditionnelle espagnole avec poulet, fruits de mer et légumes',
    prepTime: 30,
    cookTime: 40,
    defaultServings: 6,
    tags: 'Espagnol,Riz,Festif',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Faire revenir poulet et saucisse. 2. Ajouter poivron, pois cassés, safran. 3. Incorporer le riz et le bouillon. 4. À mi-cuisson, ajouter calamars et palourdes. 5. Cuire jusqu\'à absorption complète du liquide.',
    ingredients: [
      { name: 'Riz basmati', quantity: 400, unit: 'g' },
      { name: 'Blanc de poulet', quantity: 4, unit: 'filet' },
      { name: 'Saucisse fumée', quantity: 2, unit: 'pièce' },
      { name: 'Calamar', quantity: 300, unit: 'g' },
      { name: 'Palourde', quantity: 500, unit: 'g' },
      { name: 'Poivron', quantity: 2, unit: 'pièce' },
      { name: 'Pois cassés', quantity: 100, unit: 'g' },
      { name: 'Safran', quantity: 1, unit: 'pincée' },
      { name: 'Bouillon cube', quantity: 2, unit: 'pièce' },
      { name: 'Huile d\'olive', quantity: 40, unit: 'ml' },
    ],
  },
  {
    title: 'Boeuf aux carottes',
    description: 'Boeuf mijoté avec carottes et oignons, sauce onctueuse',
    prepTime: 25,
    cookTime: 120,
    defaultServings: 4,
    tags: 'Viande,Mijoté,Classique',
    source: 'Famille',
    mealCourse: 'plat',
    instructions: '1. Faire dorer les morceaux de viande. 2. Ajouter oignons, carottes, ail. 3. Mouiller avec eau et vin rouge. 4. Laisser mijoter 2 heures à feu doux avec bouquet garni.',
    ingredients: [
      { name: 'Viande hachée', quantity: 800, unit: 'g' },
      { name: 'Carotte', quantity: 8, unit: 'pièce' },
      { name: 'Oignon', quantity: 3, unit: 'pièce' },
      { name: 'Ail', quantity: 2, unit: 'gousse' },
      { name: 'Vin rouge', quantity: 200, unit: 'ml' },
      { name: 'Bouillon cube', quantity: 1, unit: 'pièce' },
      { name: 'Bouquet garni', quantity: 1, unit: 'pièce' },
      { name: 'Huile d\'olive', quantity: 20, unit: 'ml' },
    ],
  },
  {
    title: 'Pot-au-feu',
    description: 'Plat traditionnel français avec viande, légumes et bouillon',
    prepTime: 30,
    cookTime: 180,
    defaultServings: 6,
    tags: 'Viande,Mijoté,Classique,Hiver',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Faire revenir la viande (poitrine, paleron). 2. Ajouter carottes, poireaux, navets, céleri, oignons. 3. Couvrir d\'eau, ajouter bouquet garni. 4. Laisser mijoter 3 heures. 5. Servir viande et légumes avec bouillon à part.',
    ingredients: [
      { name: 'Poitrine fumée', quantity: 800, unit: 'g' },
      { name: 'Pomme de terre', quantity: 6, unit: 'pièce' },
      { name: 'Carotte', quantity: 6, unit: 'pièce' },
      { name: 'Poireau', quantity: 2, unit: 'pièce' },
      { name: 'Navet', quantity: 3, unit: 'pièce' },
      { name: 'Céleri', quantity: 1, unit: 'pièce' },
      { name: 'Oignon', quantity: 2, unit: 'pièce' },
      { name: 'Bouquet garni', quantity: 1, unit: 'pièce' },
      { name: 'Sel', quantity: 10, unit: 'g' },
    ],
  },
  {
    title: 'Cassoulet',
    description: 'Cassoulet toulousain avec haricots blancs, saucisses et viande',
    prepTime: 40,
    cookTime: 120,
    defaultServings: 6,
    tags: 'Viande,Haricots,Mijoté,Festif',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Faire tremper les haricots blancs 12h. 2. Cuire les haricots avec carottes, oignons, bouquet garni. 3. Faire revenir saucisses, lardons, confit de canard. 4. Mélanger le tout, couvrir de bouillon. 5. Cuire 2h au four à 160°C.',
    ingredients: [
      { name: 'Haricots blancs', quantity: 500, unit: 'g' },
      { name: 'Saucisse fumée', quantity: 4, unit: 'pièce' },
      { name: 'Lardons fumés', quantity: 300, unit: 'g' },
      { name: 'Carotte', quantity: 3, unit: 'pièce' },
      { name: 'Oignon', quantity: 2, unit: 'pièce' },
      { name: 'Bouillon cube', quantity: 2, unit: 'pièce' },
      { name: 'Bouquet garni', quantity: 1, unit: 'pièce' },
      { name: 'Ail', quantity: 2, unit: 'gousse' },
      { name: 'Tomates pelées', quantity: 200, unit: 'g' },
    ],
  },
  {
    title: 'Saucisses lentilles',
    description: 'Saucisses fumées accompagnées de lentilles à la vinaigrette',
    prepTime: 15,
    cookTime: 45,
    defaultServings: 4,
    tags: 'Viande,Légumineuses,Rapide',
    source: 'Famille',
    mealCourse: 'plat',
    instructions: '1. Cuire les lentilles dans l\'eau avec bouillon cube et laurier. 2. Faire griller les saucisses. 3. Égoutter les lentilles, ajouter vinaigre, huile d\'olive, échalote. 4. Servir avec les saucisses.',
    ingredients: [
      { name: 'Saucisse fumée', quantity: 4, unit: 'pièce' },
      { name: 'Haricots rouges', quantity: 300, unit: 'g' },
      { name: 'Carotte', quantity: 2, unit: 'pièce' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Bouillon cube', quantity: 1, unit: 'pièce' },
      { name: 'Laurier', quantity: 2, unit: 'feuille' },
      { name: 'Vinaigre balsamique', quantity: 20, unit: 'ml' },
      { name: 'Huile d\'olive', quantity: 20, unit: 'ml' },
      { name: 'Échalote', quantity: 1, unit: 'pièce' },
    ],
  },
  {
    title: 'Poulet à la crème',
    description: 'Blancs de poulet mijotés dans une sauce crémeuse aux champignons',
    prepTime: 20,
    cookTime: 30,
    defaultServings: 4,
    tags: 'Viande,Crème,Rapide',
    source: 'Famille',
    mealCourse: 'plat',
    instructions: '1. Faire dorer les blancs de poulet dans le beurre. 2. Réserver. 3. Faire revenir champignons et échalote. 4. Déglacer au vin blanc. 5. Ajouter crème fraîche, remettez le poulet. 6. Laisser mijoter 15 min.',
    ingredients: [
      { name: 'Blanc de poulet', quantity: 4, unit: 'filet' },
      { name: 'Champignons', quantity: 300, unit: 'g' },
      { name: 'Crème fraîche', quantity: 300, unit: 'ml' },
      { name: 'Vin blanc', quantity: 100, unit: 'ml' },
      { name: 'Beurre', quantity: 30, unit: 'g' },
      { name: 'Échalote', quantity: 2, unit: 'pièce' },
    ],
  },
  {
    title: 'Agneau aux flageolets',
    description: 'Ragoût d\'agneau avec flageolets, un classique du sud-ouest',
    prepTime: 30,
    cookTime: 90,
    defaultServings: 4,
    tags: 'Viande,Mijoté,Classique',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Faire revenir morceaux d\'agneau. 2. Ajouter oignons, ail, carottes, tomates. 3. Incorporer flageolets cuits, vin rouge, bouillon. 4. Laisser mijoter 1h30 à feu doux.',
    ingredients: [
      { name: 'Agneau', quantity: 800, unit: 'g' },
      { name: 'Haricots blancs', quantity: 400, unit: 'g' },
      { name: 'Carotte', quantity: 3, unit: 'pièce' },
      { name: 'Oignon', quantity: 2, unit: 'pièce' },
      { name: 'Ail', quantity: 2, unit: 'gousse' },
      { name: 'Tomates pelées', quantity: 200, unit: 'g' },
      { name: 'Vin rouge', quantity: 150, unit: 'ml' },
      { name: 'Bouillon cube', quantity: 1, unit: 'pièce' },
      { name: 'Thym frais', quantity: 2, unit: 'branche' },
    ],
  },
  {
    title: 'Magret de canard à l\'orange',
    description: 'Magret de canard caramélisé avec une sauce à l\'orange douce et acidulée',
    prepTime: 15,
    cookTime: 25,
    defaultServings: 4,
    tags: 'Viande,Canard,Festif',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Faire revenir le magret peau côté bas à feu moyen 8 min. 2. Retirer, réserver. 3. Dans le même plat, ajouter jus d\'orange, miel, vinaigre. 4. Réduire, ajouter zeste d\'orange. 5. Servir le magret tranché avec la sauce.',
    ingredients: [
      { name: 'Magret de canard', quantity: 2, unit: 'pièce' },
      { name: 'Orange', quantity: 3, unit: 'pièce' },
      { name: 'Miel', quantity: 50, unit: 'g' },
      { name: 'Vinaigre balsamique', quantity: 20, unit: 'ml' },
      { name: 'Huile d\'olive', quantity: 10, unit: 'ml' },
    ],
  },
  {
    title: 'Calamars à l\'ail',
    description: 'Calamars sautés à l\'ail avec persil et citron, un plat méditerranéen léger',
    prepTime: 20,
    cookTime: 10,
    defaultServings: 3,
    tags: 'Poisson,Rapide,Méditerranéen',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Nettoyer et couper les calamars en rondelles. 2. Faire chauffer huile d\'olive, ajouter calamars. 3. Cuire 2 min à feu vif. 4. Ajouter ail haché, persil, zeste de citron. 5. Arroser de jus de citron avant de servir.',
    ingredients: [
      { name: 'Calamar', quantity: 600, unit: 'g' },
      { name: 'Ail', quantity: 3, unit: 'gousse' },
      { name: 'Persil frais', quantity: 1, unit: 'bouquet' },
      { name: 'Citron', quantity: 1, unit: 'pièce' },
      { name: 'Huile d\'olive', quantity: 40, unit: 'ml' },
    ],
  },
  {
    title: 'Palourdes à la marinière',
    description: 'Palourdes cuites dans un court-bouillon au vin blanc, échalote et persil',
    prepTime: 10,
    cookTime: 10,
    defaultServings: 2,
    tags: 'Poisson,Fruits de mer,Rapide',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Nettoyer les palourdes sous l\'eau froide. 2. Dans une casserole, faire revenir échalote dans le beurre. 3. Ajouter vin blanc, laisser réduire 2 min. 4. Ajouter palourdes, couvrir. 5. Cuire 5 min jusqu\'à ce qu\'elles s\'ouvrent. 6. Parsemer de persil.',
    ingredients: [
      { name: 'Palourde', quantity: 1, unit: 'kg' },
      { name: 'Vin blanc', quantity: 200, unit: 'ml' },
      { name: 'Échalote', quantity: 2, unit: 'pièce' },
      { name: 'Beurre', quantity: 50, unit: 'g' },
      { name: 'Persil frais', quantity: 1, unit: 'bouquet' },
    ],
  },
  {
    title: 'Ratatouille',
    description: 'Légumes du soleil mijotés à l\'huile d\'olive, un classique provençal',
    prepTime: 30,
    cookTime: 45,
    defaultServings: 4,
    tags: 'Végétarien,Légumes,Classique,Été',
    source: 'Tradition',
    mealCourse: 'accompagnement',
    instructions: '1. Couper courgettes, aubergines, poivrons, tomates en dés. 2. Faire revenir oignon, ail dans l\'huile d\'olive. 3. Ajouter les légumes par ordre de cuisson (poivron, aubergine, courgette, tomate). 4. Laisser mijoter 45 min à feu doux avec thym et laurier.',
    ingredients: [
      { name: 'Courgette', quantity: 3, unit: 'pièce' },
      { name: 'Poivron', quantity: 2, unit: 'pièce' },
      { name: 'Tomate', quantity: 6, unit: 'pièce' },
      { name: 'Oignon', quantity: 2, unit: 'pièce' },
      { name: 'Ail', quantity: 2, unit: 'gousse' },
      { name: 'Huile d\'olive', quantity: 60, unit: 'ml' },
      { name: 'Thym frais', quantity: 1, unit: 'branche' },
      { name: 'Laurier', quantity: 1, unit: 'feuille' },
    ],
  },
  {
    title: 'Soupe à l\'oignon',
    description: 'Soupe gratinée aux oignons caramélisés, fromage et croûtons',
    prepTime: 20,
    cookTime: 40,
    defaultServings: 4,
    tags: 'Soupe,Fromage,Hiver,Classique',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Émincer finement les oignons. 2. Les faire revenir dans le beurre jusqu\'à caramélisation. 3. Mouiller avec eau, ajouter bouillon cube. 4. Laisser mijoter 30 min. 5. Verser dans des bols, ajouter pain grillé et fromage râpé. 6. Passer sous le gril.',
    ingredients: [
      { name: 'Oignon', quantity: 8, unit: 'pièce' },
      { name: 'Beurre', quantity: 60, unit: 'g' },
      { name: 'Pain de mie', quantity: 4, unit: 'tranche' },
      { name: 'Fromage râpé', quantity: 150, unit: 'g' },
      { name: 'Bouillon cube', quantity: 2, unit: 'pièce' },
      { name: 'Vin blanc', quantity: 100, unit: 'ml' },
    ],
  },
  {
    title: 'Gratin dauphinois',
    description: 'Gratin de pommes de terre à la crème et à l\'ail, recouvert de fromage',
    prepTime: 25,
    cookTime: 60,
    defaultServings: 4,
    tags: 'Gratin,Légumes,Fromage,Classique',
    source: 'Tradition',
    mealCourse: 'accompagnement',
    instructions: '1. Éplucher et couper les pommes de terre en fines rondelles. 2. Dans un plat, alterner couches de pommes de terre, crème, lait, ail, noix de muscade. 3. Terminer par une couche de fromage râpé. 4. Cuire 1h à 180°C.',
    ingredients: [
      { name: 'Pomme de terre', quantity: 1, unit: 'kg' },
      { name: 'Crème fraîche', quantity: 300, unit: 'ml' },
      { name: 'Lait', quantity: 200, unit: 'ml' },
      { name: 'Fromage râpé', quantity: 100, unit: 'g' },
      { name: 'Ail', quantity: 2, unit: 'gousse' },
      { name: 'Noix de muscade', quantity: 5, unit: 'g' },
      { name: 'Beurre', quantity: 30, unit: 'g' },
    ],
  },
  {
    title: 'Quiche lorraine',
    description: 'Tarte salée aux lardons, œufs et crème fraîche',
    prepTime: 25,
    cookTime: 40,
    defaultServings: 4,
    tags: 'Quiche,Tarte,Classique',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Étaler la pâte à tarte dans un moule. 2. Faire revenir les lardons. 3. Battre œufs, crème, lait, sel, poivre. 4. Répartir lardons sur le fond de tarte, verser l\'appareil à quiche. 5. Cuire 40 min à 180°C.',
    ingredients: [
      { name: 'Pâte à tarte', quantity: 1, unit: 'pièce' },
      { name: 'Lardons fumés', quantity: 200, unit: 'g' },
      { name: 'Œufs', quantity: 3, unit: 'pièce' },
      { name: 'Crème fraîche', quantity: 200, unit: 'ml' },
      { name: 'Lait', quantity: 100, unit: 'ml' },
      { name: 'Fromage râpé', quantity: 80, unit: 'g' },
    ],
  },
  {
    title: 'Tartiflette',
    description: 'Gratin de pommes de terre, lardons et reblochon fondu',
    prepTime: 20,
    cookTime: 50,
    defaultServings: 4,
    tags: 'Gratin,Fromage,Montagne,Hiver',
    source: 'Tradition',
    mealCourse: 'plat',
    instructions: '1. Cuire les pommes de terre à l\'eau, les couper en rondelles. 2. Faire revenir lardons et oignons. 3. Dans un plat, alterner couches de pommes de terre, lardons, fromage à tartiflette. 4. Arroser de crème fraîche. 5. Cuire 40 min à 200°C.',
    ingredients: [
      { name: 'Pomme de terre', quantity: 1, unit: 'kg' },
      { name: 'Lardons fumés', quantity: 200, unit: 'g' },
      { name: 'Oignon', quantity: 2, unit: 'pièce' },
      { name: 'Fromage à tartiflette', quantity: 300, unit: 'g' },
      { name: 'Crème fraîche', quantity: 200, unit: 'ml' },
      { name: 'Vin blanc', quantity: 100, unit: 'ml' },
    ],
  },
  {
    title: 'Soupe de légumes',
    description: 'Soupe maison avec légumes de saison et pâtes',
    prepTime: 15,
    cookTime: 30,
    defaultServings: 4,
    tags: 'Soupe,Légumes,Rapide,Hiver',
    source: 'Famille',
    mealCourse: 'entrée',
    instructions: '1. Éplucher et couper tous les légumes en morceaux. 2. Faire revenir oignon dans l\'huile d\'olive. 3. Ajouter légumes, couvrir d\'eau, ajouter bouillon cube. 4. Laisser mijoter 25 min. 5. Ajouter pâtes courtes et cuire 8 min supplémentaires.',
    ingredients: [
      { name: 'Carotte', quantity: 3, unit: 'pièce' },
      { name: 'Pomme de terre', quantity: 2, unit: 'pièce' },
      { name: 'Courgette', quantity: 2, unit: 'pièce' },
      { name: 'Tomate', quantity: 2, unit: 'pièce' },
      { name: 'Poivron', quantity: 1, unit: 'pièce' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Pâtes courtes', quantity: 100, unit: 'g' },
      { name: 'Bouillon cube', quantity: 1, unit: 'pièce' },
      { name: 'Huile d\'olive', quantity: 20, unit: 'ml' },
    ],
  },
  {
    title: 'Purée de potiron',
    description: 'Purée onctueuse de potiron, légèrement sucrée',
    prepTime: 15,
    cookTime: 25,
    defaultServings: 4,
    tags: 'Légumes,Végétarien,Automne',
    source: 'Famille',
    mealCourse: 'accompagnement',
    instructions: '1. Couper le potiron en morceaux, retirer les graines. 2. Cuire à l\'eau bouillante ou à la vapeur 20 min. 3. Égoutter, écraser à la fourchette. 4. Ajouter beurre, crème et cannelle. Mixer pour une texture lisse.',
    ingredients: [
      { name: 'Potiron', quantity: 1, unit: 'kg' },
      { name: 'Beurre', quantity: 50, unit: 'g' },
      { name: 'Crème fraîche', quantity: 100, unit: 'ml' },
      { name: 'Cannelle', quantity: 5, unit: 'g' },
    ],
  },
  {
    title: 'Tiramisu',
    description: 'Dessert italien à base de biscuits cuillère, mascarpone et café',
    prepTime: 25,
    cookTime: 0,
    defaultServings: 6,
    tags: 'Dessert,Italien,Froid,Festif',
    source: 'Tradition',
    mealCourse: 'dessert',
    instructions: '1. Séparer les blancs des jaunes d\'œufs. 2. Monter les blancs en neige avec le sucre. 3. Mélanger jaunes avec mascarpone. 4. Incorporer délicatement les blancs. 5. Tremper rapidement les biscuits dans le café. 6. Alterner couches de biscuits et crème. 7. Terminer par du cacao. 8. Réfrigérer 4h minimum.',
    ingredients: [
      { name: 'Biscuits cuillère', quantity: 200, unit: 'g' },
      { name: 'Mascarpone', quantity: 250, unit: 'g' },
      { name: 'Œufs', quantity: 3, unit: 'pièce' },
      { name: 'Sucre', quantity: 100, unit: 'g' },
      { name: 'Café soluble', quantity: 20, unit: 'g' },
      { name: 'Chocolat noir', quantity: 50, unit: 'g' },
    ],
  },
  {
    title: 'Crème brûlée',
    description: 'Crème vanille recouverte d\'une fine couche de sucre caramélisé',
    prepTime: 15,
    cookTime: 45,
    defaultServings: 4,
    tags: 'Dessert,Crème,Classique,Festif',
    source: 'Tradition',
    mealCourse: 'dessert',
    instructions: '1. Chauffer la crème fleurette avec la gousse de vanille fendue. 2. Battre les jaunes d\'œufs avec le sucre. 3. Verser la crème chaude sur les jaunes en remuant. 4. Répartir dans des ramequins. 5. Cuire au bain-marie 40 min à 110°C. 6. Laisser refroidir, saupoudrer de sucre et caraméliser au chalumeau.',
    ingredients: [
      { name: 'Crème fleurette', quantity: 500, unit: 'ml' },
      { name: 'Œufs', quantity: 4, unit: 'pièce' },
      { name: 'Sucre', quantity: 150, unit: 'g' },
      { name: 'Gousse de vanille', quantity: 1, unit: 'pièce' },
    ],
  },
  {
    title: 'Tarte aux pommes',
    description: 'Tarte classique aux pommes avec pâte sablée',
    prepTime: 20,
    cookTime: 35,
    defaultServings: 6,
    tags: 'Dessert,Tarte,Fruit,Classique',
    source: 'Famille',
    mealCourse: 'dessert',
    instructions: '1. Étaler la pâte à tarte dans un moule. 2. Éplucher et couper les pommes en fines tranches. 3. Disposer les pommes en rosace sur la pâte. 4. Saupoudrer de sucre et de cannelle. 5. Ajouter petits morceaux de beurre. 6. Cuire 35 min à 180°C.',
    ingredients: [
      { name: 'Pâte à tarte', quantity: 1, unit: 'pièce' },
      { name: 'Pomme', quantity: 6, unit: 'pièce' },
      { name: 'Sucre', quantity: 100, unit: 'g' },
      { name: 'Cannelle', quantity: 5, unit: 'g' },
      { name: 'Beurre', quantity: 30, unit: 'g' },
    ],
  },
  {
    title: 'Mousse au chocolat',
    description: 'Mousse légère au chocolat noir, un classique indémodable',
    prepTime: 15,
    cookTime: 0,
    defaultServings: 4,
    tags: 'Dessert,Chocolat,Froid,Rapide',
    source: 'Tradition',
    mealCourse: 'dessert',
    instructions: '1. Faire fondre le chocolat au bain-marie ou au micro-ondes. 2. Séparer les blancs des jaunes d\'œufs. 3. Ajouter les jaunes au chocolat fondu. 4. Monter les blancs en neige ferme avec une pincée de sel. 5. Incorporer délicatement les blancs au mélange chocolat. 6. Répartir dans des verrines et réfrigérer 2h minimum.',
    ingredients: [
      { name: 'Chocolat noir', quantity: 200, unit: 'g' },
      { name: 'Œufs', quantity: 4, unit: 'pièce' },
      { name: 'Sucre', quantity: 50, unit: 'g' },
    ],
  },
  {
    title: 'Clafoutis aux cerises',
    description: 'Clafoutis moelleux aux cerises fraîches',
    prepTime: 15,
    cookTime: 40,
    defaultServings: 6,
    tags: 'Dessert,Fruit,Classique',
    source: 'Tradition',
    mealCourse: 'dessert',
    instructions: '1. Disposer les cerises dénoyautées au fond d\'un moule beurré. 2. Préparer un appareil à clafoutis avec œufs, sucre, farine, lait. 3. Verser sur les cerises. 4. Cuire 40 min à 180°C. 5. Saupoudrer de sucre glace avant de servir tiède.',
    ingredients: [
      { name: 'Cerise', quantity: 500, unit: 'g' },
      { name: 'Œufs', quantity: 3, unit: 'pièce' },
      { name: 'Sucre', quantity: 100, unit: 'g' },
      { name: 'Farine', quantity: 100, unit: 'g' },
      { name: 'Lait', quantity: 300, unit: 'ml' },
      { name: 'Beurre', quantity: 30, unit: 'g' },
    ],
  },
  {
    title: 'Poire pochée au vin rouge',
    description: 'Poires pochées dans du vin rouge, épicées et parfumées',
    prepTime: 10,
    cookTime: 30,
    defaultServings: 4,
    tags: 'Dessert,Fruit,Vin,Classique',
    source: 'Tradition',
    mealCourse: 'dessert',
    instructions: '1. Éplucher les poires en gardant la queue. 2. Dans une casserole, porter à ébullition vin rouge, sucre, cannelle, zeste d\'orange. 3. Ajouter les poires, couvrir et laisser pocher 25 min à feu doux. 4. Servir tiède avec la sauce réduites.',
    ingredients: [
      { name: 'Poire', quantity: 4, unit: 'pièce' },
      { name: 'Vin rouge', quantity: 500, unit: 'ml' },
      { name: 'Sucre', quantity: 100, unit: 'g' },
      { name: 'Cannelle', quantity: 5, unit: 'g' },
      { name: 'Orange', quantity: 1, unit: 'pièce' },
    ],
  },
  {
    title: 'Fromage de chèvre chaud',
    description: 'Bûche de chèvre chaude sur lit de salade et miel',
    prepTime: 5,
    cookTime: 10,
    defaultServings: 2,
    tags: 'Entrée,Fromage,Rapide,Chaud',
    source: 'Tradition',
    mealCourse: 'entrée',
    instructions: '1. Couper la bûche de chèvre en rondelles. 2. Disposer sur un lit de salade. 3. Passer 5-10 min sous le gril ou au four à 180°C. 4. Arroser de miel avant de servir.',
    ingredients: [
      { name: 'Fromage de chèvre', quantity: 200, unit: 'g' },
      { name: 'Salade', quantity: 1, unit: 'pied' },
      { name: 'Miel', quantity: 30, unit: 'g' },
      { name: 'Noix', quantity: 50, unit: 'g' },
      { name: 'Huile d\'olive', quantity: 10, unit: 'ml' },
    ],
  },
  {
    title: 'Tarte au fromage',
    description: 'Tarte salée avec garniture crémeuse aux fromages et lardons',
    prepTime: 20,
    cookTime: 35,
    defaultServings: 4,
    tags: 'Tarte,Fromage,Quiche',
    source: 'Famille',
    mealCourse: 'plat',
    instructions: '1. Étaler la pâte feuilletée dans un moule. 2. Piquer le fond avec une fourchette. 3. Répartir lardons et fromage râpé. 4. Verser un mélange d\'œufs, crème et lait. 5. Cuire 35 min à 180°C.',
    ingredients: [
      { name: 'Pâte feuilletée', quantity: 1, unit: 'pièce' },
      { name: 'Lardons fumés', quantity: 150, unit: 'g' },
      { name: 'Fromage râpé', quantity: 150, unit: 'g' },
      { name: 'Œufs', quantity: 3, unit: 'pièce' },
      { name: 'Crème fraîche', quantity: 200, unit: 'ml' },
      { name: 'Lait', quantity: 100, unit: 'ml' },
    ],
  },
  {
    title: 'Pâtes aux anchois et olives',
    description: 'Pâtes simples mais savoureuses avec anchois et olives noires',
    prepTime: 10,
    cookTime: 12,
    defaultServings: 3,
    tags: 'Pâtes,Poisson,Rapide',
    source: 'Méditerranée',
    mealCourse: 'plat',
    instructions: '1. Cuire les pâtes al dente. 2. Pendant ce temps, hacher finement anchois et olives. 3. Égoutter les pâtes, mélanger avec anchois, olives, huile d\'olive et persil. 4. Bien mélanger et servir avec du parmesan.',
    ingredients: [
      { name: 'Pâtes alimentaires', quantity: 300, unit: 'g' },
      { name: 'Anchois en boîte', quantity: 50, unit: 'g' },
      { name: 'Olives noires', quantity: 100, unit: 'g' },
      { name: 'Huile d\'olive', quantity: 30, unit: 'ml' },
      { name: 'Persil frais', quantity: 1, unit: 'bouquet' },
      { name: 'Parmesan', quantity: 40, unit: 'g' },
    ],
  },
  {
    title: 'Chorizo grillé aux pommes',
    description: 'Chorizo grillé accompagné de pommes caramélisées',
    prepTime: 10,
    cookTime: 15,
    defaultServings: 2,
    tags: 'Viande,Rapide,Apéritif',
    source: 'Espagne',
    mealCourse: 'plat',
    instructions: '1. Couper le chorizo en tranches épaisses. 2. Faire griller à la poêle ou au barbecue. 3. Éplucher et couper les pommes en quartiers. 4. Faire revenir les pommes dans une poêle avec du beurre et un peu de sucre jusqu\'à caramélisation. 5. Servir le chorizo avec les pommes.',
    ingredients: [
      { name: 'Chorizo', quantity: 200, unit: 'g' },
      { name: 'Pomme', quantity: 2, unit: 'pièce' },
      { name: 'Beurre', quantity: 20, unit: 'g' },
      { name: 'Sucre', quantity: 20, unit: 'g' },
    ],
  },
  {
    title: 'Brouillade aux champignons',
    description: 'Œufs brouillés crémeux avec champignons et persil',
    prepTime: 10,
    cookTime: 10,
    defaultServings: 2,
    tags: 'Rapide,Œufs,Petit-déjeuner',
    source: 'Famille',
    mealCourse: 'plat',
    instructions: '1. Faire revenir les champignons émincés dans le beurre. 2. Battre les œufs avec la crème, sel et poivre. 3. Ajouter les œufs aux champignons. 4. Remuer doucement jusqu\'à obtenir la consistance souhaitée. 5. Ajouter le persil haché avant de servir.',
    ingredients: [
      { name: 'Œufs', quantity: 4, unit: 'pièce' },
      { name: 'Champignons', quantity: 150, unit: 'g' },
      { name: 'Crème fraîche', quantity: 50, unit: 'ml' },
      { name: 'Beurre', quantity: 30, unit: 'g' },
      { name: 'Persil frais', quantity: 1, unit: 'bouquet' },
    ],
  },
];

async function seed() {
  console.log('🌱 Seed de la base de données...\n');

  // Vérifier les données existantes
  const existingRecipes = await db.select().from(recipes);
  const existingIngredients = await db.select().from(ingredients);
  
  console.log(`Données actuelles:`);
  console.log(`  - Recettes: ${existingRecipes.length}`);
  console.log(`  - Ingrédients: ${existingIngredients.length}\n`);

  if (existingRecipes.length > 0 || existingIngredients.length > 0) {
    console.log('⚠️  Base déjà partiellement remplie.');
    console.log('   Pour tout vider d\'abord, utilisez npm run seed:clear\n');
  }

  try {
    // Insérer les ingrédients
    console.log('🥕 Insertion des ingrédients...');
    const ingredientMap: Record<string, string> = {};
    
    for (const ing of seedIngredients) {
      try {
        const [result] = await db.insert(ingredients)
          .values(ing)
          .returning({ id: ingredients.id });
        ingredientMap[ing.name] = result.id;
        console.log(`  ✓ ${ing.name}`);
      } catch (e: any) {
        if (e.message?.includes('UNIQUE constraint failed')) {
          const existing = await db.select({ id: ingredients.id })
            .from(ingredients)
            .where(eq(ingredients.name, ing.name))
            .limit(1);
          if (existing[0]) {
            ingredientMap[ing.name] = existing[0].id;
            console.log(`  ⚠ ${ing.name} (existe)`);
          }
        }
      }
    }
    console.log(`✅ ${Object.keys(ingredientMap).length} ingrédients traités\n`);

    // Insérer les recettes
    console.log('🍽️ Insertion des recettes...');
    const recipeMap: Record<string, string> = {};
    
    for (const recipeData of recipesData) {
      try {
        const [result] = await db.insert(recipes)
          .values({
            title: recipeData.title,
            description: recipeData.description,
            mealCourse: recipeData.mealCourse,
            prepTime: recipeData.prepTime,
            cookTime: recipeData.cookTime,
            defaultServings: recipeData.defaultServings,
            tags: recipeData.tags,
            source: recipeData.source,
            instructions: recipeData.instructions,
          })
          .returning({ id: recipes.id });
        recipeMap[recipeData.title] = result.id;
        console.log(`  ✓ ${recipeData.title}`);
      } catch (e: any) {
        if (e.message?.includes('UNIQUE constraint failed')) {
          const existing = await db.select({ id: recipes.id })
            .from(recipes)
            .where(eq(recipes.title, recipeData.title))
            .limit(1);
          if (existing[0]) {
            recipeMap[recipeData.title] = existing[0].id;
            console.log(`  ⚠ ${recipeData.title} (existe)`);
          }
        }
      }
    }
    console.log(`✅ ${Object.keys(recipeMap).length} recettes traitées\n`);

    // Insérer les associations
    console.log('🔗 Insertion des associations recettes-ingrédients...');
    let linkCount = 0;
    
    for (const recipeData of recipesData) {
      const recipeId = recipeMap[recipeData.title];
      if (!recipeId) continue;
      
      for (const ing of recipeData.ingredients) {
        const ingId = ingredientMap[ing.name];
        if (ingId) {
          try {
            await db.insert(recipeIngredients).values({
              recipeId,
              ingredientId: ingId,
              quantity: ing.quantity,
              unit: ing.unit,
            });
            linkCount++;
          } catch (e: any) {
            if (!e.message?.includes('UNIQUE constraint failed')) throw e;
          }
        }
      }
    }
    console.log(`✅ ${linkCount} associations insérées\n`);

    // Vérification finale
    const finalRecipes = await db.select().from(recipes);
    const finalIngredients = await db.select().from(ingredients);
    const finalLinks = await db.select().from(recipeIngredients);
    
    console.log('🎉 Seed terminé !');
    console.log(`   Total: ${finalRecipes.length} recettes, ${finalIngredients.length} ingrédients, ${finalLinks.length} associations`);
    
    return { recipes: finalRecipes.length, ingredients: finalIngredients.length, links: finalLinks.length };
  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  }
}

// Exécuter le seed
const args = process.argv.slice(2);
const shouldClear = args.includes('--clear') || args.includes('-c');

async function main() {
  if (shouldClear) {
    console.log('🧹 Vidage de la base...');
    await db.delete(recipeIngredients);
    await db.delete(recipes);
    await db.delete(ingredients);
    console.log('✅ Base vidée\n');
  }
  
  await seed();
}

main().catch(console.error);
