// scripts/seed-ingredients.ts — Bibliothèque d'ingrédients de référence.
//
// Enrichit le catalogue d'ingrédients (~250 entrées, 12 rayons) sans jamais
// toucher aux données existantes :
//   - idempotent : anti-doublon sur (foyer, nom) — l'UNIQUE par foyer posé par
//     la migration 0009 (F17, C-062) ignore les doublons, y compris les
//     ingrédients saisis manuellement par la famille ;
//   - non destructif : aucune recette, association, plan ou article de
//     courses n'est modifié ;
//   - sûr sur une base en service : aucune migration, simple insertion.
//
// F17 multi-tenant (C-062, contrat 4b §1.4) : le point d'entrée réutilisable
// est seedIngredientLibraryForHousehold(householdId) — les inscriptions du
// mode MULTI_HOUSEHOLDS=ON démarrent avec un catalogue vide, le bouton
// « remplir le catalogue » de /welcome appelle cette fonction pour LE foyer.
//
// CLI : npm run db:seed-ingredients (applicable autant de fois que voulu,
// sur une base vierge comme sur une base de production) — cible le FOYER
// PRINCIPAL via la base applicative (SQLITE_PATH). Ce module n'ouvre AUCUNE
// base à l'import : il est réutilisé par l'action serveur de /welcome, et le
// main() ne s'exécute que si c'est bien lui le point d'entrée (argv).

import { db } from '../lib/db';
import { ingredients } from '../lib/db/schema';
import { ensurePrimaryHousehold } from '../lib/household';

export type SeedHouseholdResult = {
  inserted: number;
  skipped: number;
};

// Rayons de supermarché (mêmes noms que le seed de démo)
const R = {
  fruitsLegumes: 'Fruits & Légumes',
  boucherie: 'Boucherie/Volaille',
  poissonnerie: 'Poissonnerie',
  epicerieSalee: 'Épicerie Salée',
  epicerieSucree: 'Épicerie Sucrée',
  produitsLaitiers: 'Produits Laitiers',
  boissons: 'Boissons',
  conserve: 'Conserves',
  condiments: 'Condiments & Sauces',
  matieresGrasses: 'Matières Grasses',
  boulangerie: 'Boulangerie',
  surgeles: 'Surgelés',
} as const;

const LIBRARY: { name: string; category: string; defaultUnit: string }[] = [
  // ---------------- Fruits & Légumes ----------------
  ...['Tomate', 'Tomates cerises', 'Oignon', 'Oignon rouge', 'Oignon jaune', 'Échalote', 'Ail', 'Carotte', 'Poireau', 'Pomme de terre', 'Pomme de terre douce', 'Patate douce', 'Courgette', 'Aubergine', 'Poivron rouge', 'Poivron vert', 'Poivron jaune', 'Piment', 'Salade verte', 'Roquette', 'Épinards', 'Batavia', 'Chou-fleur', 'Brocoli', 'Chou blanc', 'Chou rouge', 'Chou de Bruxelles', 'Chou kale', 'Blette', 'Céleri', 'Céleri-branche', 'Fenouil', 'Concombre', 'Cornichon', 'Radis', 'Radis noir', 'Betterave', 'Navet', 'Potiron', 'Butternut', 'Citrouille', 'Courge spaghetti', 'Endive', 'Asperge', 'Artichaut', 'Petits pois', 'Haricots verts', 'Haricots beurre', 'Câpre', 'Champignons de Paris', 'Champignons shiitakés', 'Pleurotes', 'Cèpes', 'Girolles', 'Pousses de soja', 'Germes de luzerne', 'Mâche', 'Cresson', 'Pois chiches frais']
    .map((name) => ({ name, category: R.fruitsLegumes, defaultUnit: 'pièce' })),
  ...['Salade', 'Chou romanesco', 'Tomate séchée'].map((name) => ({ name, category: R.fruitsLegumes, defaultUnit: 'pièce' })),
  ...['Herbes fraîches', 'Persil', 'Persil plat', 'Coriandre fraîche', 'Basilic', 'Menthe fraîche', 'Ciboulette', 'Aneth', 'Estragon', 'Thym frais', 'Romarin', 'Sauge', 'Laurier', 'Vergeoise de sarriette', 'Cerfeuil'].map((name) => ({ name, category: R.fruitsLegumes, defaultUnit: 'bouquet' })),
  ...['Ail', 'Gingembre frais', 'Citron', 'Citron vert', 'Orange', 'Mandarine', 'Clémentine', 'Pamplemousse', 'Pomme', 'Poire', 'Banane', 'Kiwi', 'Fraise', 'Framboise', 'Myrtille', 'Mûre', 'Cerise', 'Abricot', 'Pêche', 'Nectarine', 'Prune', 'Raisin', 'Melon', 'Pastèque', 'Ananas', 'Mangue', 'Fruit de la passion', 'Litchi', 'Noix de coco', 'Avocat', 'Datte', 'Figue', 'Rhubarbe', 'Raisin sec', 'Fruit rouge', 'Reine-claude', 'Châtaigne', 'Noix fraîche'].map((name) => ({ name, category: R.fruitsLegumes, defaultUnit: 'pièce' })),

  // ---------------- Boucherie / Volaille ----------------
  ...['Blanc de poulet', 'Cuisses de poulet', 'Poulet entier', 'Escalope de poulet', 'Ailes de poulet', 'Dinde escalope', 'Blanc de dinde', 'Steak de bœuf', 'Bavette', 'Entrecôte', 'Filet de bœuf', 'Viande hachée de bœuf', 'Viande hachée de porc', 'Rôti de bœuf', 'Bœuf bourguignon (morceau)', 'Paleron', 'Joue de bœuf', 'Côte de porc', 'Filet mignon de porc', 'Rôti de porc', 'Échine de porc', 'Lardons fumés', 'Lard de poitrine', 'Chair à saucisse', 'Saucisse de Toulouse', 'Saucisse de Francfort', 'Merguez', 'Chipolata', 'Agneau gigot', 'Côte d’agneau', 'Épaule d’agneau', 'Souris d’agneau', 'Côtelettes d’agneau', 'Veau escalope', 'Blanc de veau', 'Rôti de veau'].map((name) => ({ name, category: R.boucherie, defaultUnit: 'g' })),
  ...['Jambon blanc', 'Jambon blanc découenné', 'Jambon cru', 'Jambon de Bayonne', 'Prosciutto', 'Pancetta', 'Chorizo', 'Saucisson', 'Saucisse sèche', 'Mortadelle', 'Terrine', 'Paté de campagne', 'Rillettes'].map((name) => ({ name, category: R.boucherie, defaultUnit: 'tranches' })),
  ...['Lapin', 'Caille', 'Canard magret', 'Magret de canard', 'Confit de canard', 'Foie gras', 'Gésiers'].map((name) => ({ name, category: R.boucherie, defaultUnit: 'g' })),

  // ---------------- Poissonnerie ----------------
  ...['Saumon', 'Pavé de saumon', 'Filet de saumon', 'Truite', 'Cabillaud', 'Dos de cabillaud', 'Merlu', 'Colin', 'Lieu', 'Bar', 'Daurade', 'Sole', 'Turbot', 'Saint-Jacques', 'Noix de Saint-Jacques', 'Crevettes', 'Gambas', 'Crevettes grises', 'Moules', 'Huîtres', 'Palourdes', 'Bulots', 'Encornets', 'Calamars', 'Poulpe', 'Thon frais', 'Filet de thon', 'Anchois frais', 'Sardines fraîches', 'Maquereau', 'Hareng', 'Lotte', 'Rouget', 'Langoustines', 'Crabe', 'Tourteau', 'Homard', 'Écrevisses'].map((name) => ({ name, category: R.poissonnerie, defaultUnit: 'g' })),

  // ---------------- Épicerie salée ----------------
  ...['Pâtes alimentaires', 'Pâtes penne', 'Pâtes fusilli', 'Spaghetti', 'Tagliatelles', 'Pâtes à lasagnes', 'Pâtes à cannelloni', 'Pâtes coquillettes', 'Nouilles chinoises', 'Nouilles de riz', 'Vermicelles de riz', 'Riz basmati', 'Riz rond', 'Riz arborio', 'Riz complet', 'Riz sauvage', 'Riz à sushi', 'Semoule', 'Boulgour', 'Quinoa', 'Couscous', 'Épeautre', 'Pois cassés', 'Lentilles vertes', 'Lentilles corail', 'Lentilles du Puy', 'Pois chiches', 'Haricots rouges', 'Haricots blancs', 'Haricots noirs', 'Haricots borlotti', 'Fèves', 'Flageolets', 'Azuki', 'Farine', 'Farine de blé', 'Farine complète', 'Farine de sarrasin', 'Farine de riz', 'Farine de maïs', 'Fécule de maïs', 'Maïzena', 'Levure chimique', 'Levure de boulanger', 'Levure fraîche', 'Levain', 'Chapelure', 'Pain de mie', 'Biscottes', 'Œufs', 'Blanc d’œuf', 'Jaune d’œuf', 'Pain à burger', 'Tortillas de blé', 'Pâte feuilletée', 'Pâte brisée', 'Pâte à pizza', 'Pâte filo', 'Pâte sablée', 'Cacahuètes', 'Noix', 'Noisettes', 'Amandes', 'Amandes effilées', 'Pistaches', 'Pignons de pin', 'Noix de cajou', 'Noix du Brésil', 'Graines de sésame', 'Graines de courge', 'Graines de tournesol', 'Graines de chia', 'Graines de lin', 'Pavot', 'Dattes dénoyautées', 'Oléagineux mélangés'].map((name) => ({ name, category: R.epicerieSalee, defaultUnit: 'g' })),
  ...['Sucre', 'Sucre en poudre', 'Sucre glace', 'Sucre roux', 'Sucre vanillé', 'Cassonade', 'Sucre de canne', 'Miel', 'Sirop d’érable', 'Sirop d’agave', 'Confiture', 'Gelée de groseille', 'Pâte à tartiner', 'Chocolat noir', 'Chocolat au lait', 'Chocolat blanc', 'Chocolat de cuisson', 'Cacao en poudre', 'Poudre d’amandes', 'Noix de coco râpée', 'Vanille', 'Gousse de vanille', 'Sucre vanille', 'Bonbons', 'Chewing-gum'].map((name) => ({ name, category: R.epicerieSucree, defaultUnit: 'g' })),
  ...['Yaourt', 'Yaourt nature', 'Yaourt grec', 'Yaourt aux fruits', 'Fromage blanc', 'Petit-suisse', 'Crème fraîche', 'Crème entière', 'Crème allégée', 'Crème épaisse', 'Crème liquide', 'Crème fleurette', 'Crème acidulée', 'Mascarpone', 'Ricotta', 'Beurre', 'Beurre demi-sel', 'Lait', 'Lait demi-écrémé', 'Lait entier', 'Lait de coco', 'Crème de coco', 'Lait d’amande', 'Lait de soja', 'Lait d’avoine', 'Lait concentré', 'Lait en poudre', 'Fromage râpé', 'Emmental', 'Comté', 'Gruyère', 'Beaufort', 'Cheddar', 'Parmesan', 'Pecorino', 'Mozzarella', 'Burrata', 'Feta', 'Chèvre', 'Bûche de chèvre', 'Bleu', 'Roquefort', 'Fourme d’Ambert', 'Camembert', 'Brie', 'Munster', 'Raclette', 'Morbier', 'Reblochon', 'Saint-Marcellin', 'Coulommiers', 'Vacherin', 'Tête de moine', 'Halloumi', 'Tofu', 'Tofu ferme', 'Tofu soyeux', 'Tempeh', 'Seitan'].map((name) => ({ name, category: R.produitsLaitiers, defaultUnit: 'g' })),

  // ---------------- Boissons ----------------
  ...['Eau', 'Eau gazeuse', 'Jus d’orange', 'Jus de pomme', 'Jus de fruits', 'Jus de légumes', 'Nectar', 'Sirop', 'Sirop de menthe', 'Sirop de grenadine', 'Thé', 'Thé vert', 'Thé noir', 'Infusion', 'Café', 'Café moulu', 'Café en grains', 'Café soluble', 'Bière', 'Vin blanc', 'Vin rouge', 'Vin rosé', 'Champagne', 'Rhum', 'Vodka', 'Whisky', 'Gin', 'Cognac', 'Liqueur', 'Apéritif', 'Cidre'].map((name) => ({ name, category: R.boissons, defaultUnit: 'L' })),
  ...['Vin blanc de cuisson', 'Vin rouge de cuisson', 'Bouillon de volaille', 'Bouillon de bœuf', 'Bouillon de légumes', 'Fond de veau', 'Fumet de poisson', 'Vinaigre', 'Vinaigre de vin', 'Vinaigre de vin rouge', 'Vinaigre balsamique', 'Vinaigre de cidre', 'Vinaigre de riz', 'Vinaigre blanc', 'Alcool de cuisine'].map((name) => ({ name, category: R.condiments, defaultUnit: 'ml' })),

  // ---------------- Conserves ----------------
  ...['Thon en boîte', 'Sardines à l’huile', 'Maquereau en boîte', 'Saumon en boîte', 'Crabe en boîte', 'Maïs en boîte', 'Haricots verts en boîte', 'Haricots blancs en boîte', 'Lentilles en boîte', 'Pois chiches en boîte', 'Petits pois en boîte', 'Flageolets en boîte', 'Tomates concassées', 'Tomates pelées', 'Tomate concentrée', 'Coulis de tomate', 'Pulpe de tomate', 'Pâté de foie', 'Câpres en boîte', 'Olives noires', 'Olives vertes', 'Cœurs d’artichaut en boîte', 'Moules en boîte', 'Lait de coco en boîte', 'Champignons en boîte', 'Marrons en boîte'].map((name) => ({ name, category: R.conserve, defaultUnit: 'boîte' })),

  // ---------------- Condiments & Sauces ----------------
  ...['Moutarde', 'Moutarde de Dijon', 'Moutarde à l’ancienne', 'Ketchup', 'Mayonnaise', 'Sauce tomate', 'Sauce bolognaise', 'Coulis tomate basilic', 'Sauce barbecue', 'Sauce soja', 'Sauce tamari', 'Sauce nuoc-mâm', 'Sauce teriyaki', 'Sauce huîtres', 'Sauce sriracha', 'Sauce piquante', 'Tabasco', 'Harissa', 'Sauce curry', 'Sauce béarnaise', 'Sauce hollandaise', 'Sauce tartare', 'Sauce aïoli', 'Sauce cocktail', 'Sauce au poivre', 'Sauce roquefort', 'Huile d’olive', 'Huile de tournesol', 'Huile de colza', 'Huile de pépins de raisin', 'Huile de sésame', 'Huile de noix', 'Huile neutre', 'Sel', 'Sel fin', 'Sel de mer', 'Gros sel', 'Poivre', 'Poivre noir', 'Poivre blanc', 'Poivre de Sichuan', 'Paprika', 'Piment doux', 'Piment en poudre', 'Cayenne', 'Curry en poudre', 'Curry doux', 'Curry fort', 'Colombo', 'Ras-el-hanout', 'Massalé', 'Garam massala', 'Cumin', 'Cumin en poudre', 'Coriandre en poudre', 'Cannelle', 'Cannelle bâton', 'Muscade', 'Gingembre en poudre', 'Curcuma', 'Safran', 'Cardamome', 'Anis étoilé', 'Badiane', 'Clou de girofle', 'Girole', 'Origan', 'Thym séché', 'Laurier séché', 'Herbes de Provence', 'Mélange 4 épices', 'Cinq-épices', 'Sucre vanilliné', 'Fond de volaille en poudre', 'Fond de bœuf en poudre', 'Cube de bouillon', 'Cube de bouillon légumes', 'Miso', 'Pâte de curry', 'Pâte de wasabi', 'Tahini', 'Beurre de cacahuète', 'Purée d’amande', 'Purée de noisette', 'Grenade mélasse', 'Sirop d’érable'].map((name) => ({ name, category: R.condiments, defaultUnit: 'g' })),
  ...['Huile d’olive vierge extra', 'Olive noire', 'Olive verte'].map((name) => ({ name, category: R.condiments, defaultUnit: 'g' })),

  // ---------------- Boulangerie ----------------
  ...['Pain', 'Baguette', 'Pain de campagne', 'Pain complet', 'Pain aux céréales', 'Pain de seigle', 'Pain pita', 'Pain naan', 'Focaccia', 'Brioche', 'Croissant', 'Pain au chocolat', 'Pain de mie brioché', 'Galettes de riz', 'Gaufre', 'Crêpes', 'Blé tortilla'].map((name) => ({ name, category: R.boulangerie, defaultUnit: 'pièce' })),

  // ---------------- Surgelés ----------------
  ...['Épinards surgelés', 'Haricots verts surgelés', 'Petits pois surgelés', 'Brocolis surgelés', 'Mix de légumes surgelés', 'Frites surgelées', 'Pommes dauphines surgelées', 'Crevettes surgelées', 'Poisson pané surgelé', 'Poulet surgelé', 'Viande hachée surgelée', 'Glace vanille', 'Glace chocolat', 'Sorbet', 'Fruits rouges surgelés', 'Pain au surgelé', 'Pâte brisée surgelée', 'Boules de glace', 'Gaufres surgelées', 'Herbes surgelées', 'Gingembre surgelé'].map((name) => ({ name, category: R.surgeles, defaultUnit: 'g' })),
];

// Insère la bibliothèque dans le catalogue DU foyer — anti-doublon
// (household_id, name), transaction SYNCHRONE better-sqlite3, idempotent.
export function seedIngredientLibraryForHousehold(householdId: string): SeedHouseholdResult {
  let inserted = 0;
  let skipped = 0;
  db.transaction((tx) => {
    for (const item of LIBRARY) {
      const result = tx
        .insert(ingredients)
        .values({
          name: item.name,
          category: item.category,
          defaultUnit: item.defaultUnit,
          householdId,
        })
        .onConflictDoNothing()
        .run();
      if (result.changes > 0) inserted++;
      else skipped++;
    }
  });
  return { inserted, skipped };
}

// CLI : foyer principal (famille unique de l'instance auto-hébergée). Le
// backfill y rattache aussi les éventuelles lignes orphelines pré-0009.
function main() {
  console.log('Bibliothèque d’ingrédients de référence');
  console.log(`${LIBRARY.length} entrées dans ${new Set(LIBRARY.map((i) => i.category)).size} rayons`);

  const householdId = ensurePrimaryHousehold();
  const { inserted, skipped } = seedIngredientLibraryForHousehold(householdId);

  console.log(`  ✓ ${inserted} ingrédients ajoutés (foyer principal ${householdId})`);
  console.log(`  • ${skipped} déjà présents (ignorés — aucune donnée modifiée)`);
  const total = db.select({ id: ingredients.id }).from(ingredients).all().length;
  console.log(`\nCatalogue total : ${total} ingrédients`);
}

// N'exécuter le main QUE si c'est ce script qui est invoqué (npm run
// db:seed-ingredients / npx tsx) — PAS à l'import par l'action /welcome.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/seed-ingredients.ts')) {
  main();
}
