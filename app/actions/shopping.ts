'use server';

import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth-guards';
import { ingredients, shoppingItems } from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { manualShoppingItemInput, shoppingPeriodInput, type ShoppingFormState } from '@/lib/validators/shopping';
import { generateShoppingRows } from '@/app/shopping-list/queries';

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

// Date locale au format YYYY-MM-DD (comparaison lexicographique fiable)
function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Dernier jour de la période : aujourd'hui + (days - 1)
function periodEndDateStr(days: number): string {
  const end = new Date();
  end.setDate(end.getDate() + days - 1);
  return toLocalDateStr(end);
}

// Générer la liste de courses depuis les repas planifiés de la période.
// Le cœur (requêtes, mise à l'échelle, fusion, déduction du garde-manger,
// remplacement atomique) vit dans app/shopping-list/queries.ts — module
// partagé avec le test runtime (leçons C-047/C-055).
export async function generateShoppingList(
  prevState: ShoppingFormState,
  formData: FormData
): Promise<ShoppingFormState> {
  const rawData = formDataToRecord(formData);

  try {
    await requireSession();

    const parsed = shoppingPeriodInput.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Période invalide',
        errors: parsed.error.flatten().fieldErrors,
        values: rawData,
      };
    }

    let startDate: string;
    let endDate: string;
    if (parsed.data.mode === 'custom') {
      startDate = parsed.data.startDate as string;
      endDate = parsed.data.endDate as string;
    } else {
      startDate = toLocalDateStr(new Date());
      endDate = periodEndDateStr(parsed.data.days as number);
    }

    const { rowCount, plannedMeals, deducted, excluded } = generateShoppingRows(startDate, endDate);

    revalidatePath('/shopping-list');

    if (plannedMeals === 0) {
      return {
        success: true,
        message: 'Aucun repas planifié avec recette sur cette période — liste générée vidée',
      };
    }

    // Le stock du garde-manger est déduit en amont : l'utilisateur voit
    // tout de suite ce que la réserve a couvert (F11)
    const stockNote =
      deducted + excluded > 0
        ? ` — garde-manger : ${deducted} article${deducted > 1 ? 's' : ''} réduit${deducted > 1 ? 's' : ''}, ${excluded} exclu${excluded > 1 ? 's' : ''}`
        : '';

    return {
      success: true,
      message: `Liste générée : ${rowCount} article${rowCount > 1 ? 's' : ''} du ${startDate} au ${endDate}${stockNote}`,
    };
  } catch (error) {
    console.error('Erreur lors de la génération de la liste de courses:', error);
    return {
      success: false,
      message: 'Une erreur est survenue lors de la génération de la liste',
      values: rawData,
    };
  }
}

// Ajouter un article saisi à la main (addedManually = true)
export async function addManualShoppingItem(
  prevState: ShoppingFormState,
  formData: FormData
): Promise<ShoppingFormState> {
  const rawData = formDataToRecord(formData);

  try {
    await requireSession();

    const parsed = manualShoppingItemInput.safeParse(rawData);
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      return {
        success: false,
        message: firstError || 'Données invalides',
        errors: parsed.error.flatten().fieldErrors,
        values: rawData,
      };
    }

    // Liaison optionnelle à un ingrédient existant : l'article hérite du
    // rayon de l'ingrédient (regroupement correct dans la liste) et d'un
    // ingredientId (utile au garde-manger F11). Sinon article libre.
    const ingredientId = (formData.get('ingredientId') as string | null)?.trim() || null;
    if (ingredientId) {
      const [ingredient] = await db
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(eq(ingredients.id, ingredientId))
        .limit(1);
      if (!ingredient) {
        return { success: false, message: 'Ingrédient introuvable', values: rawData };
      }
    }
    await db.insert(shoppingItems).values({
      manualName: parsed.data.name,
      ingredientId: ingredientId,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      isBought: false,
      addedManually: true,
    });

    revalidatePath('/shopping-list');
    return { success: true, message: 'Article ajouté à la liste' };
  } catch (error) {
    console.error("Erreur lors de l'ajout manuel d'un article:", error);
    return {
      success: false,
      message: "Une erreur est survenue lors de l'ajout de l'article",
      values: rawData,
    };
  }
}

// Cocher / décocher un article (généré ou manuel)
export async function toggleShoppingItem(
  id: string,
  isBought: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    await requireSession();

    await db.update(shoppingItems).set({ isBought }).where(eq(shoppingItems.id, id));

    revalidatePath('/shopping-list');
    return { success: true, message: '' };
  } catch (error) {
    console.error("Erreur lors du changement d'état d'un article:", error);
    return { success: false, message: "Impossible de mettre à jour l'article" };
  }
}

// Supprimer un article de la liste (généré ou manuel)
export async function deleteShoppingItem(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireSession();

    await db.delete(shoppingItems).where(eq(shoppingItems.id, id));

    revalidatePath('/shopping-list');
    return { success: true, message: '' };
  } catch (error) {
    console.error('Erreur lors de la suppression d\'un article:', error);
    return { success: false, message: 'Impossible de supprimer l\'article' };
  }
}

// Purger la liste : supprime TOUS les articles (générés et manuels,
// achetés ou non). Irréversible — la validation se fait côté UI
// (ConfirmDialog) avant l'appel.
export async function purgeShoppingList(
  boughtOnly: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    await requireSession();
    // boughtOnly (défaut côté UI) : purge de fin de courses — on ne vide
    // que ce qui a été coché, la pending list survit. Sinon purge totale.
    const result = boughtOnly
      ? await db.delete(shoppingItems).where(eq(shoppingItems.isBought, true))
      : await db.delete(shoppingItems);
    revalidatePath('/shopping-list');
    const scope = boughtOnly ? 'achetés' : '';
    return {
      success: true,
      message: `${result.changes} article(s) ${scope} supprimé(s) — ${boughtOnly ? 'liste des achats réinitialisée' : 'liste vidée'}`,
    };
  } catch (error) {
    console.error('Erreur lors de la purge de la liste:', error);
    return { success: false, message: 'Impossible de purger la liste' };
  }
}
