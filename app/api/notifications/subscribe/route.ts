// F10 — clé publique VAPID pour l'abonnement Web Push (sect. /profile).
// Requires une session : la clé n'est utile qu'aux comptes connectés.
import { auth } from '@/lib/auth';
import { getVapidPublicKey } from '@/lib/notifications';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) {
    return Response.json(
      { error: 'Notifications non configurées sur le serveur (VAPID_PUBLIC_KEY manquant)' },
      { status: 503 },
    );
  }
  return Response.json({ vapidPublicKey });
}
