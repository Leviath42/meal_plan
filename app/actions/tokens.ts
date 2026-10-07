'use server';

import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { accessTokens, users } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-guards';
import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';

// Type de jeton : partage du calendrier en lecture seule ou accès API
export type AccessTokenData = {
  id: string;
  token: string;
  createdByUserId: string | null;
  type: 'calendar_read' | 'api';
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

// Jeton tel que présenté dans l'interface d'administration
export type AccessTokenWithStatus = {
  id: string;
  token: string;
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

// Créer un jeton d'accès (ADMIN uniquement)
export async function createAccessToken(
  type: 'calendar_read' | 'api',
  expiresInDays: number
): Promise<{ success: boolean; message?: string; token?: AccessTokenData }> {
  try {
    const session = await requireAdmin();

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + expiresInDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const [created] = await db
      .insert(accessTokens)
      .values({
        token: randomBytes(32).toString('hex'),
        createdByUserId: session.user.id,
        type,
        expiresAt,
        revokedAt: null,
        createdAt: now.toISOString(),
      })
      .returning();

    revalidatePath('/share');
    return { success: true, token: created as AccessTokenData };
  } catch (error) {
    console.error('Erreur lors de la création du jeton:', error);
    return {
      success: false,
      message: 'Impossible de créer le jeton',
    };
  }
}

// Lister tous les jetons (ADMIN uniquement), du plus récent au plus ancien
export async function listAccessTokens(): Promise<{
  success: boolean;
  tokens?: AccessTokenWithStatus[];
}> {
  try {
    await requireAdmin();

    const rows = await db
      .select({
        id: accessTokens.id,
        token: accessTokens.token,
        type: accessTokens.type,
        createdAt: accessTokens.createdAt,
        expiresAt: accessTokens.expiresAt,
        revokedAt: accessTokens.revokedAt,
        createdByEmail: users.email,
      })
      .from(accessTokens)
      .leftJoin(users, eq(accessTokens.createdByUserId, users.id))
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
    await requireAdmin();

    await db
      .update(accessTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(accessTokens.id, id));

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
// le jeton EST l'autorisation. Retourne null si inexistant, révoqué,
// expiré ou d'un type non autorisé.
export async function validateAccessToken(
  token: string,
  allowedTypes: ('calendar_read' | 'api')[]
): Promise<AccessTokenData | null> {
  const [record] = await db
    .select()
    .from(accessTokens)
    .where(eq(accessTokens.token, token))
    .limit(1);

  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt <= new Date().toISOString()) return null;
  if (!allowedTypes.includes(record.type)) return null;

  return record as AccessTokenData;
}
