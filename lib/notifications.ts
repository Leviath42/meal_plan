// lib/notifications.ts
// F10 — Notifications du repas du jour (contrat vague 4, W1).
// Toute la logique est ici (testable en exécution via scripts/test-notifications.ts) :
// les server actions (app/actions/notifications.ts) et l'API
// (app/api/notifications/**) ne font que valider l'entrée (Zod/session/secret)
// puis déléguer à ces fonctions — le test exécute donc le code de production.
import { and, eq, isNotNull } from 'drizzle-orm';
import { sendNotification } from 'web-push';
import { db } from '@/lib/db';
import { mealPlans, pushSubscriptions, recipes, users } from '@/lib/db/schema';

// Heure « HH:MM » valide (fuseau local du foyer — Europe/Paris en prod via TZ)
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidNotifyTime(value: string): boolean {
  return HHMM_RE.test(value);
}

// ---------------------------------------------------------------------------
// Fuseau Europe/Paris (critique : TZ=Europe/Paris en prod, AGENTS.md). Le
// banquet de dates du planning est en ISO « YYYY-MM-JJ » (schéma meal_plans).
// ---------------------------------------------------------------------------

// Date du jour à Paris, format « YYYY-MM-JJ » (comparable aux dates du planning)
export function getParisDateStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// Heure à Paris, format « HH:MM » (comparable à users.notify_time)
export function getParisTimeStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
}

// ---------------------------------------------------------------------------
// Heure de rappel (users.notify_time — null = notifications désactivées)
// ---------------------------------------------------------------------------

export async function getNotifyTime(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ notifyTime: users.notifyTime })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.notifyTime ?? null;
}

// time = null → désactivation du rappel pour ce compte
export async function setNotifyTime(userId: string, time: string | null): Promise<void> {
  await db
    .update(users)
    .set({ notifyTime: time, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// Abonnements Web Push (push_subscriptions — endpoint unique par appareil,
// un même navigateur réabonné met à jour sa ligne, jamais de doublon)
// ---------------------------------------------------------------------------

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function savePushSubscription(
  userId: string,
  sub: PushSubscriptionInput,
): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.p256dh, auth: sub.auth },
    });
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

// Désactivation complète : supprime les abonnements de l'utilisateur
export async function removePushSubscriptionsByUser(userId: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function hasPushSubscription(userId: string): Promise<boolean> {
  const rows = await db
    .select({ endpoint: pushSubscriptions.endpoint })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .limit(1);
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Repas du jour (lecture du planning existant : meal_plans ← recipes)
// ---------------------------------------------------------------------------

// Titres du repas du jour dans l'ordre chronologique type de repas
// (Midi avant Soir — ordre historique du calendrier), ou null si aucun repas.
// Un repas sans recette (customNote planifié à la main) est couvert par la
// même lecture que le calendrier : titre = recette, sinon note, sinon type.
const MEAL_TYPE_ORDER = ['Petit-déjeuner', 'Midi', 'Goûter', 'Soir'];

export async function getTodayMeals(dateStr: string): Promise<
  { mealType: string; label: string }[]
> {
  const rows = await db
    .select({
      mealType: mealPlans.mealType,
      customNote: mealPlans.customNote,
      recipeTitle: recipes.title,
    })
    .from(mealPlans)
    .leftJoin(recipes, eq(mealPlans.recipeId, recipes.id))
    .where(eq(mealPlans.date, dateStr));

  return rows
    .sort((a, b) => {
      const orderA = MEAL_TYPE_ORDER.indexOf(a.mealType);
      const orderB = MEAL_TYPE_ORDER.indexOf(b.mealType);
      return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
    })
    .map((meal) => ({
      mealType: meal.mealType,
      label: meal.recipeTitle ?? meal.customNote ?? meal.mealType,
    }));
}

export interface DailyMealPayload {
  title: string;
  body: string;
  date: string;
  url: string;
}

// « Aujourd'hui : [repas] » — null si aucun repas planifié (rien à envoyer)
export async function buildDailyMealPayload(
  dateStr: string = getParisDateStr(),
): Promise<DailyMealPayload | null> {
  const meals = await getTodayMeals(dateStr);
  if (meals.length === 0) return null;

  const listed = meals.map((m) => `${m.label} (${m.mealType})`).join(', ');
  return {
    title: 'Repas du jour',
    body: `Aujourd'hui : ${listed}`,
    date: dateStr,
    url: '/',
  };
}

// ---------------------------------------------------------------------------
// Envoi (VAPID — clés dans .env.local, cf. runbook docs/deploiement-proxmox.md)
// ---------------------------------------------------------------------------

// Clé publique VAPID, exposée aux clients pour s'abonner (GET /api/notifications/subscribe)
export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY ?? '';
}

function getVapidDetails(): { subject: string; publicKey: string; privateKey: string } | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? '';
  if (!publicKey || !privateKey) return null;
  return {
    subject: process.env.VAPID_SUBJECT ?? 'mailto:contact@mealplan.invalid',
    publicKey,
    privateKey,
  };
}

// Abonnés à notifier : abonnement présent ET notify_time non null (désactivé
// = jamais notifié). time optionnel = ne garder que les comptes dont l'heure
// de rappel correspond (cron minute par minute, cf. runbook).
export interface PushSubscriberRow {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function listPushRecipients(time?: string): Promise<PushSubscriberRow[]> {
  const where = isNotNull(users.notifyTime);
  return db
    .select({
      userId: pushSubscriptions.userId,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(users, eq(pushSubscriptions.userId, users.id))
    .where(time ? and(where, eq(users.notifyTime, time)) : where)
    .orderBy(pushSubscriptions.endpoint);
}

// Envoi réel à un abonné (mock endpoint : scripts/test-notifications.ts vérifie
// la requête construite via webpush.generateRequestDetails, même code).
export async function pushToSubscription(
  sub: PushSubscriberRow,
  payload: DailyMealPayload,
  options?: { vapidDetails?: { subject: string; publicKey: string; privateKey: string } },
): Promise<void> {
  const vapid = options?.vapidDetails ?? getVapidDetails();
  if (!vapid) {
    throw new Error('Notifications : VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY absents (.env.local)');
  }
  await sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload),
    { vapidDetails: vapid, TTL: 60 * 60, urgency: 'normal' },
  );
}

export interface DailyPushResult {
  // Repas du jour trouvé (sinon rien n'est envoyé)
  mealPlanned: boolean;
  // Abonnés éligibles (abonnement + notify_time non null), après filtrage heure
  recipients: number;
  sent: number;
  // Abonnements obsolètes supprimés (404/410 du service push)
  removed: number;
  failed: number;
}

// Envoi du rappel du jour. Ne fait rien s'il n'y a aucun repas planifié.
// Supprime les abonnements morts (404/410) pour ne pas encombrer le service.
export async function sendDailyPushNotifications(opts?: {
  time?: string;
}): Promise<DailyPushResult> {
  const payload = await buildDailyMealPayload();
  const result: DailyPushResult = {
    mealPlanned: payload !== null,
    recipients: 0,
    sent: 0,
    removed: 0,
    failed: 0,
  };
  if (!payload) return result;

  const recipients = await listPushRecipients(opts?.time);
  result.recipients = recipients.length;

  for (const sub of recipients) {
    try {
      await pushToSubscription(sub, payload);
      result.sent++;
    } catch (error) {
      // WebPushError 404/410 = abonnement révoqué côté navigateur
      const status =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? (error as { statusCode?: number }).statusCode
          : undefined;
      if (status === 404 || status === 410) {
        await removePushSubscription(sub.endpoint);
        result.removed++;
      } else {
        result.failed++;
      }
    }
  }
  return result;
}
