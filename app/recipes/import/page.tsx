import { ImportRecipeForm } from './ImportRecipeForm';

export default function ImportRecipePage() {
  return (
    <main className="px-3 sm:px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-lg sm:text-xl font-bold mb-3">Importer une recette depuis une URL</h1>
        <p className="text-xs sm:text-sm text-gray-600 mb-4">
          Colle le lien d’une recette (Marmiton, 750g, ou tout site avec des données Schema.org) :
          la recette est extraite, prévisualisée, puis créée après confirmation.
        </p>
        <ImportRecipeForm />
      </div>
    </main>
  );
}
