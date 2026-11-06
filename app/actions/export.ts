'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-guards';
import { buildExportEnvelope } from '@/lib/export';
import { importExportData } from '@/lib/import';

// F18 : actions export/import de la section ADMIN « Export / Import » de
// /settings. Toute entrée utilisateur passe par requireAdmin (garde session +
// rôle revalidés en base) — les server actions sont invocables directement,
// le proxy ne protège que les pages.

export type ExportImportFormState = { success?: boolean; message?: string } | null;

// Export : renvoie l'enveloppe JSON complète (jamais de secret — cf. lib/export).
// Réservé aux tests/programmes : l'UI télécharge via GET /settings/export,
// qui reste accessible en essai expiré (lecture seule ; les POST d'actions
// sont bloqués par la garde du proxy).
export async function exportAllData(): Promise<string> {
  const admin = await requireAdmin();
  // F17 (C-062) : export des données DU FOYER de session uniquement
  const householdId = (admin.user as { householdId?: string }).householdId;
  if (!householdId) {
    throw new Error('Session invalide : compte sans foyer');
  }
  return JSON.stringify(await buildExportEnvelope(householdId), null, 2);
}

// Taille plafonnée : une base familiale tient loin de cette limite, un fichier
// énorme ne doit pas faire tourner la validation Zod pendant des minutes.
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

// Import : le fichier JSON est validé puis appliqué en une transaction
// atomique par lib/import (tout ou rien, doublons de titre suffixés).
export async function importAllData(
  prevState: ExportImportFormState,
  formData: FormData
): Promise<ExportImportFormState> {
  try {
    await requireAdmin();

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, message: 'Sélectionnez un fichier JSON à importer.' };
    }
    if (file.size > MAX_IMPORT_BYTES) {
      return { success: false, message: 'Fichier trop volumineux (maximum 10 Mo).' };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      return { success: false, message: "Le fichier n'est pas un JSON valide." };
    }

    const admin = await requireAdmin();
    const householdId = (admin.user as { householdId?: string }).householdId;
    if (!householdId) {
      return { success: false, message: 'Session invalide : compte sans foyer' };
    }
    // F17 (C-062) : l'import écrit TOUT dans le foyer de session
    const result = await importExportData(payload, householdId);
    if (result.success) {
      // Le planning, les recettes, la page garde-manger et les paramètres
      // peuvent tous avoir changé : invalidation large.
      revalidatePath('/', 'layout');
    }
    return result;
  } catch (error) {
    console.error('Erreur lors de l’import des données:', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Une erreur est survenue pendant l'import";
    return { success: false, message };
  }
}
