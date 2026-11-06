'use server';

// F11 — Garde-manger : Server Actions de /pantry. Toute écriture passe par
// requireSession (MEMBER/ADMIN écrit, GUEST refusé — cf. lib/auth-guards.ts).
// La logique SQL vit dans app/pantry/queries.ts, partagée avec les tests
// runtime (leçon C-055 : tester les requêtes de production, pas une réplique).
//
// F17 multi-tenant (C-062) : le foyer de session est passé à chaque helper —
// le stock et le catalogue sont isolés par foyer (contrat 4b §1.3).

import { requireHousehold } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';
import { pantryItemInput, type PantryFormState } from '@/lib/validators/pantry';
import { deletePantryItemById, findIngredientById, upsertPantryItem } from '@/app/pantry/queries';

// Helper pour convertir FormData en Record<string, string>
function formDataToRecord(formData: FormData): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      record[key] = value;
    }
  }
  return record;
}

// Enregistrer une ligne de stock : création ou mise à jour (une seule ligne
// par ingrédient, contrainte unique en base — un double envoi édite la ligne
// existante au lieu d'en créer une deuxième).
export async function savePantryItem(
  prevState: PantryFormState,
  formData: FormData
): Promise<PantryFormState> {
  const rawData = formDataToRecord(formData);

  try {
    const { householdId } = await requireHousehold();

    const parsed = pantryItemInput.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Données invalides',
        errors: parsed.error.flatten().fieldErrors,
        values: rawData,
      };
    }

    const ingredient = findIngredientById(parsed.data.ingredientId, householdId);
    if (!ingredient) {
      return {
        success: false,
        message: 'Ingrédient introuvable au catalogue',
        values: rawData,
      };
    }

    upsertPantryItem({
      ingredientId: parsed.data.ingredientId,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      expiresAt: parsed.data.expiresAt,
      householdId,
    });

    revalidatePath('/pantry');
    revalidatePath('/shopping-list');

    return {
      success: true,
      message: `Stock de ${ingredient.name} enregistré`,
    };
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du stock:', error);
    return {
      success: false,
      message: 'Une erreur est survenue lors de la sauvegarde',
      values: rawData,
    };
  }
}

// Supprimer une ligne du garde-manger (uniquement dans le foyer de session)
export async function removePantryItem(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { householdId } = await requireHousehold();

    if (typeof id !== 'string' || !id.trim()) {
      return { success: false, message: 'Identifiant invalide' };
    }

    const changes = deletePantryItemById(id.trim(), householdId);
    if (changes === 0) {
      return { success: false, message: 'Ligne introuvable' };
    }

    revalidatePath('/pantry');
    revalidatePath('/shopping-list');

    return { success: true, message: 'Stock supprimé' };
  } catch (error) {
    console.error('Erreur lors de la suppression du stock:', error);
    return { success: false, message: 'Impossible de supprimer cette ligne' };
  }
}
