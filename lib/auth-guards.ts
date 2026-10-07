// lib/auth-guards.ts
// Garde d'autorisation pour les Server Actions : la session et le rôle
// doivent être vérifiés côté serveur, jamais déduits de paramètres client.
import { auth } from '@/lib/auth';

export async function requireSession() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Action refusée : vous devez être connecté');
  }

  return session;
}

export async function requireAdmin() {
  const session = await requireSession();

  if (session.user.role !== 'ADMIN') {
    throw new Error('Action refusée : réservée aux administrateurs');
  }

  return session;
}
