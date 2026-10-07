// lib/auth-guards.ts
// Garde d'autorisation pour les Server Actions : la session et le rôle
// doivent être vérifiés côté serveur, jamais déduits de paramètres client.
//
// Le rôle est figé dans le JWT jusqu'à 30 jours : on le revalide en base
// à chaque action pour qu'une rétrogradation ou une suppression de compte
// soit effective immédiatement, sans attendre l'expiration du jeton.
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type Role = 'ADMIN' | 'MEMBER' | 'GUEST';

export async function requireSession() {
  const session = await auth();

  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('Action refusée : vous devez être connecté');
  }

  // État réel du compte en base (le JWT peut être obsolète)
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('Session invalide : ce compte a été supprimé, reconnectez-vous');
  }

  if (user.role === 'GUEST') {
    throw new Error('Session invalide : ce compte est en attente de validation');
  }

  // Rôle autoritaire venant de la base (le jeton peut contenir un ancien rôle)
  (session.user as { role?: Role }).role = user.role;

  return session;
}

export async function requireAdmin() {
  const session = await requireSession();

  if (session.user.role !== 'ADMIN') {
    throw new Error('Action refusée : réservée aux administrateurs');
  }

  return session;
}
