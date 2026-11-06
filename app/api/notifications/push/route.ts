// F10 — envoi du rappel du repas du jour aux abonnés (appelé par le cron
// système du conteneur, cf. runbook docs/deploiement-proxmox.md).
//
// Protégé par le secret NOTIFICATIONS_SECRET (en-tête x-notifications-secret) :
// l'appelant est un cron sans session — c'est le SEUL endpoint de l'app
// authentifié par secret partagé plutôt que par session.
// - sans secret / secret faux → 401 ;
// - query `?time=HH:MM` optionnelle : ne notifie que les comptes dont
//   l'heure de rappel correspond (cron minute par minute) ; sans filtre,
//   tous les abonnés non désactivés (notify_time non null) sont notifiés.
import { createHash, timingSafeEqual } from 'node:crypto';
import { isValidNotifyTime, sendDailyPushNotifications } from '@/lib/notifications';

// Comparaison en temps constant (les longueurs divergent = secret incorrect)
function secretMatches(expected: string, provided: string): boolean {
  const a = createHash('sha256').update(expected).digest();
  const b = createHash('sha256').update(provided).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.NOTIFICATIONS_SECRET;
  const provided = request.headers.get('x-notifications-secret');

  if (!expected || !provided || !secretMatches(expected, provided)) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const time = new URL(request.url).searchParams.get('time') ?? undefined;
  if (time && !isValidNotifyTime(time)) {
    return Response.json({ error: 'Paramètre time invalide (HH:MM)' }, { status: 400 });
  }

  const result = await sendDailyPushNotifications({ time });
  return Response.json(result, { status: 200 });
}
