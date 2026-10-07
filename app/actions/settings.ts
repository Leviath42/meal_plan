'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { appSettings, users } from '@/lib/db/schema';
import { requireAdmin, requireSession } from '@/lib/auth-guards';
import { auth } from '@/lib/auth';
import { getUserMinDaysBetween } from '@/lib/meal-planning';

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

// Validation de l'intervalle minimum entre deux plans de la même recette
const minDaysBetweenInput = z.coerce
  .number()
  .int('L\'intervalle doit être un nombre entier de jours')
  .min(0, 'Le minimum est 0 (contrôle désactivé)')
  .max(60, 'Maximum 60 jours');

// Antidoublon (F09) : intervalle minimum entre deux planifications de la
// même recette, propre à l'utilisateur connecté (défaut : 7 jours, 0 = désactivé).
// Utilisé par la page /settings pour afficher la préférence courante.
export async function getCurrentUserMinDaysBetween(): Promise<number> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return 7;
  return await getUserMinDaysBetween(userId);
}

// Mettre à jour l'intervalle antidoublon de l'utilisateur connecté
// (préférence personnelle : pas réservée aux administrateurs)
export async function updateMinDaysBetween(days: number): Promise<UpdateSettingsResult> {
  try {
    const session = await requireSession();
    const userId = session.user?.id;
    if (!userId) {
      return { success: false, message: 'Action refusée : vous devez être connecté' };
    }

    const parsed = minDaysBetweenInput.safeParse(days);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? 'Valeur invalide' };
    }

    await db
      .update(users)
      .set({ minDaysBetween: parsed.data, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId));

    revalidatePath('/settings');

    return { success: true, message: 'Préférence enregistrée' };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la préférence:', error);
    const message = error instanceof Error && error.message
      ? error.message
      : 'Une erreur est survenue lors de l\'enregistrement';
    return { success: false, message };
  }
}
