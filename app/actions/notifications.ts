'use server';

// Server actions F10 — section « Notifications » de /profile.
// Garde de session systématique (les server actions sont invocables
// directement, le middleware ne protège que les pages) + validation Zod.
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth-guards';
import {
  getNotifyTime,
  hasPushSubscription,
  isValidNotifyTime,
  removePushSubscriptionsByUser,
  savePushSubscription,
  setNotifyTime,
} from '@/lib/notifications';

export interface NotificationsActionResult {
  success: boolean;
  message: string;
}

export interface NotificationsState {
  notifyTime: string | null;
  subscribed: boolean;
}

// Lecture pour la page /profile (déjà derrière la session du layout)
export async function getNotificationsState(userId: string): Promise<NotificationsState> {
  const [notifyTime, subscribed] = await Promise.all([
    getNotifyTime(userId),
    hasPushSubscription(userId),
  ]);
  return { notifyTime, subscribed };
}

const notifyTimeInput = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide (format attendu HH:MM)');

// Activer le rappel à une heure donnée, ou le désactiver (enabled = false
// → notify_time null, le compte n'est plus notifié même s'il reste abonné)
export async function setNotifyTimeAction(
  enabled: boolean,
  time: string,
): Promise<NotificationsActionResult> {
  const session = await requireSession();

  if (!enabled) {
    await setNotifyTime(session.user.id, null);
    revalidatePath('/profile');
    return { success: true, message: 'Rappel du repas du jour désactivé.' };
  }

  const parsed = notifyTimeInput.safeParse(time);
  if (!parsed.success || !isValidNotifyTime(parsed.data)) {
    return { success: false, message: 'Heure invalide (format attendu HH:MM).' };
  }

  await setNotifyTime(session.user.id, parsed.data);
  revalidatePath('/profile');
  return { success: true, message: `Rappel du repas activé à ${parsed.data}.` };
}

// Abonnement Web Push transmis par le navigateur (PushSubscription.toJSON())
const pushSubscriptionInput = z.object({
  endpoint: z.string().url('Endpoint push invalide'),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function subscribeToPushAction(
  subscription: unknown,
): Promise<NotificationsActionResult> {
  const session = await requireSession();

  const parsed = pushSubscriptionInput.safeParse(subscription);
  if (!parsed.success) {
    return { success: false, message: 'Abonnement push invalide.' };
  }

  await savePushSubscription(session.user.id, {
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  revalidatePath('/profile');
  return { success: true, message: 'Cet appareil recevra le rappel des repas.' };
}

// Désactivation complète : abonnements supprimés + heure à null (N1)
export async function disableNotificationsAction(): Promise<NotificationsActionResult> {
  const session = await requireSession();

  await removePushSubscriptionsByUser(session.user.id);
  await setNotifyTime(session.user.id, null);
  revalidatePath('/profile');
  return { success: true, message: 'Notifications désactivées (appareils désabonnés).' };
}
