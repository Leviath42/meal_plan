'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { appSettings } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-guards';

// Paramètres de l'application (une seule ligne, id = 1, partagée par tous)
export interface AppSettings {
  defaultServings: number;
  updatedAt: string | null;
}

// Résultat d'une mise à jour des paramètres
export interface UpdateSettingsResult {
  success: boolean;
  message: string;
}

// Validation du nombre de couverts par défaut
const defaultServingsInput = z.coerce
  .number()
  .int('Le nombre de couverts doit être un entier')
  .min(1, 'Au moins 1 couvert requis')
  .max(20, 'Maximum 20 couverts');

// Lire les paramètres de l'application ; la ligne id=1 est créée avec les
// défauts si elle est absente. Pas de garde d'auth : la page /settings est
// derrière le middleware (utilisateur connecté).
export async function getAppSettings(): Promise<AppSettings> {
  let [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, 1))
    .limit(1);

  if (!row) {
    [row] = await db
      .insert(appSettings)
      .values({ id: 1, defaultServings: 4 })
      .returning();
  }

  return { defaultServings: row.defaultServings, updatedAt: row.updatedAt };
}

// Mettre à jour le nombre de couverts par défaut (ADMIN uniquement)
export async function updateDefaultServings(servings: number): Promise<UpdateSettingsResult> {
  try {
    await requireAdmin();

    const parsed = defaultServingsInput.safeParse(servings);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? 'Valeur invalide' };
    }

    const updatedAt = new Date().toISOString();
    await db
      .insert(appSettings)
      .values({ id: 1, defaultServings: parsed.data, updatedAt })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: { defaultServings: parsed.data, updatedAt },
      });

    revalidatePath('/settings');
    revalidatePath('/');

    return { success: true, message: 'Paramètres enregistrés' };
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    const message = error instanceof Error && error.message
      ? error.message
      : 'Une erreur est survenue lors de l\'enregistrement';
    return { success: false, message };
  }
}
