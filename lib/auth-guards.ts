// lib/auth-guards.ts
// Garde d'autorisation pour les Server Actions : la session, le rôle et le
// FOYER doivent être vérifiés côté serveur, jamais déduits de paramètres
// client.
//
// Le rôle est figé dans le JWT jusqu'à 30 jours : on le revalide en base
// à chaque action pour qu'une rétrogradation ou une suppression de compte
// soit effective immédiatement. Le foyer suit la même règle (F17, C-062) :
// revalidé en base à chaque action, exposé comme session.user.householdId ;
// un compte sans foyer (jamais rattaché au backfill ni à une inscription)
// est REFUSÉ — aucune isolation possible.
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { resolveHouseholdIdForUser } from '@/lib/household';
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

  // Foyer autoritaire venant de la base (F17 / C-062) : revalidé à chaque
  // action. Un compte sans foyer est rattaché au foyer principal par le
  // backfill runtime (installation pré-4b) ; refus sinon.
  const householdId = resolveHouseholdIdForUser(userId);
  if (!householdId) {
    throw new Error('Session invalide : ce compte n’est rattaché à aucun foyer');
  }

  // Rôle autoritaire venant de la base (le jeton peut contenir un ancien rôle)
  (session.user as { role?: Role }).role = user.role;
  (session.user as { householdId?: string }).householdId = householdId;

  return session;
}

export async function requireAdmin() {
  const session = await requireSession();

  if (session.user.role !== 'ADMIN') {
    throw new Error('Action refusée : réservée aux administrateurs');
  }

  return session;
}

// F17 (C-062) — raccourci des actions : session revalidée + foyer validé.
// requireSession garantit déjà un compte rattaché ; getHouseholdId extrait
// le foyer (jamais null à ce point). Point de passage unique de l'isolation :
// toute action serveur filtre ses requêtes par ce foyer.
export async function requireHousehold(): Promise<{ session: Awaited<ReturnType<typeof requireSession>>; householdId: string }> {
  const session = await requireSession();
  const householdId = (session.user as { householdId?: string }).householdId;
  if (!householdId) {
    throw new Error('Session invalide : ce compte n’est rattaché à aucun foyer');
  }
  return { session, householdId };
}

// F17 (C-062) — foyer de la requête pour les PAGES serveur (composants async
// des page.tsx) : même revalidation en base que les actions. Les pages sont
// derrière le proxy (session obligatoire) ; une page publique ne l'appelle pas.
export async function getCurrentHouseholdId(): Promise<string> {
  const { householdId } = await requireHousehold();
  return householdId;
}
