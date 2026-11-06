'use server';

import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { accessTokens, users } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-guards';
import { ensurePrimaryHousehold } from '@/lib/household';
import { revalidatePath } from 'next/cache';
import { and, desc, eq, isNull } from 'drizzle-orm';

// Jetons d'accès stockés HACHÉS (sha256, préfixe « sha256: ») : la lecture de
// la base, d'une sauvegarde ou de l'historique git ne permet plus de les
// utiliser. La valeur claire n'est montrée qu'une fois, à la création.
function hashToken(clearToken: string): string {
  return `sha256:${createHash('sha256').update(clearToken).digest('hex')}`;
}

// Type de jeton : partage du calendrier en lecture seule ou accès API
export type AccessTokenData = {
  id: string;
  token: string;
  createdByUserId: string | null;
  type: 'calendar_read' | 'api';
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  // F17 (C-062) : foyer que ce jeton est autorisé à servir — page publique,
  // ICS et JSON Home Assistant ne servent QUE ce foyer (contrat 4b §1.3)
  householdId: string | null;
};

// Jeton tel que présenté dans l'interface d'administration : la valeur du
// jeton n'en fait PAS partie (hachée en base, jamais renvoyée après création).
export type AccessTokenWithStatus = {
  id: string;
  type: 'calendar_read' | 'api';
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  createdByEmail: string | null;
  status: 'active' | 'expired' | 'revoked';
};

// Dériver le statut d'un jeton : révoqué prime sur expiré
function deriveStatus(
  token: { revokedAt: string | null; expiresAt: string },
  now: string
): 'active' | 'expired' | 'revoked' {
  if (token.revokedAt) return 'revoked';
  if (token.expiresAt <= now) return 'expired';
  return 'active';
}

// Durée de validité bornée côté serveur (l'UI propose 7/30/90 jours)
const expiresInDaysInput = z.coerce.number().int('Durée invalide').min(1, 'Minimum 1 jour').max(90, 'Maximum 90 jours');

// Créer un jeton d'accès (ADMIN uniquement). Retourne la valeur claire UNE
// SEULE fois : l'UI doit la présenter immédiatement, elle ne sera plus
// jamais récupérable.
export async function createAccessToken(
  type: 'calendar_read' | 'api',
  expiresInDays: number
): Promise<{ success: boolean; message?: string; clearToken?: string }> {
  try {
    const session = await requireAdmin();
    const householdId = (session.user as { householdId?: string }).householdId;
    if (!householdId) {
      return { success: false, message: 'Session invalide : compte sans foyer' };
    }

    const parsedDuration = expiresInDaysInput.safeParse(expiresInDays);
    if (!parsedDuration.success) {
      return { success: false, message: parsedDuration.error.issues[0]?.message ?? 'Durée invalide' };
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + parsedDuration.data * 24 * 60 * 60 * 1000
    ).toISOString();

    const clearToken = randomBytes(32).toString('hex');

    await db.insert(accessTokens).values({
      token: hashToken(clearToken),
      createdByUserId: session.user.id,
      householdId,
      type,
      expiresAt,
      revokedAt: null,
      createdAt: now.toISOString(),
    });

    revalidatePath('/share');
    return { success: true, clearToken };
  } catch (error) {
    console.error('Erreur lors de la création du jeton:', error);
    return {
      success: false,
      message: 'Impossible de créer le jeton',
    };
  }
}

// Lister tous les jetons (ADMIN uniquement), du plus récent au plus ancien.
// Aucune valeur de jeton n'est renvoyée (hachée en base).
export async function listAccessTokens(): Promise<{
  success: boolean;
  tokens?: AccessTokenWithStatus[];
}> {
  try {
    const adminSession = await requireAdmin();
    // F17 (C-062) : un admin ne liste QUE les jetons de son foyer
    const householdId = (adminSession.user as { householdId?: string }).householdId;
    if (!householdId) {
      return { success: false, tokens: [] };
    }

    const rows = await db
      .select({
        id: accessTokens.id,
        type: accessTokens.type,
        createdAt: accessTokens.createdAt,
        expiresAt: accessTokens.expiresAt,
        revokedAt: accessTokens.revokedAt,
        createdByEmail: users.email,
      })
      .from(accessTokens)
      .leftJoin(users, eq(accessTokens.createdByUserId, users.id))
      .where(eq(accessTokens.householdId, householdId))
      .orderBy(desc(accessTokens.createdAt));

    const now = new Date().toISOString();
    return {
      success: true,
      tokens: rows.map((row) => ({
        ...row,
        status: deriveStatus(row, now),
      })),
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des jetons:', error);
    return { success: false, tokens: [] };
  }
}

// Révoquer un jeton (ADMIN uniquement). Jamais de suppression : l'historique
// des partages doit rester traçable.
export async function revokeAccessToken(id: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const adminSession = await requireAdmin();
    const householdId = (adminSession.user as { householdId?: string }).householdId;
    if (!householdId) {
      return { success: false, message: 'Session invalide : compte sans foyer' };
    }

    await db
      .update(accessTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(and(eq(accessTokens.id, id), eq(accessTokens.householdId, householdId)));

    revalidatePath('/share');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la révocation du jeton:', error);
    return {
      success: false,
      message: 'Impossible de révoquer ce jeton',
    };
  }
}

// Valider un jeton présenté par une route publique. Aucune auth requise :
// le jeton EST l'autorisation. La valeur soumise est hachée avant
// comparaison — la base ne connaît que le hash.
export async function validateAccessToken(
  token: string,
  allowedTypes: ('calendar_read' | 'api')[]
): Promise<AccessTokenData | null> {
  const [record] = await db
    .select()
    .from(accessTokens)
    .where(eq(accessTokens.token, hashToken(token)))
    .limit(1);

  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt <= new Date().toISOString()) return null;
  if (!allowedTypes.includes(record.type)) return null;

  // F17 (C-062) : jeton hérité d'avant le multi-tenant (household_id NULL) —
  // backfill runtime idempotent : raccroché au foyer principal (base
  // mono-famille historique), puis définitivement scopé à ce foyer.
  if (!record.householdId) {
    const householdId = ensurePrimaryHousehold();
    await db
      .update(accessTokens)
      .set({ householdId })
      .where(and(eq(accessTokens.id, record.id), isNull(accessTokens.householdId)));
    record.householdId = householdId;
  }

  return record as AccessTokenData;
}
