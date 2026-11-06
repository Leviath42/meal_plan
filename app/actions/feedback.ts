'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import pkg from '../../package.json';
import { requireAdmin, requireHousehold } from '@/lib/auth-guards';
import {
  checkFeedbackRateLimit,
  createFeedback,
  feedbackInput,
  feedbackStatusInput,
  updateFeedbackStatus,
  type FeedbackCategory,
  type FeedbackFormState,
  type FeedbackStatus,
} from '@/lib/validators/feedback';

// F15 — Server actions des retours clients. Les gardes de session/rôle sont
// obligatoires ici : les server actions sont invocables directement, sans
// passer par la page (GUEST refusé par requireSession, admin par requireAdmin).

// Extraction de la page d'origine depuis le referer HTTP — capturé côté
// serveur, le client ne fournit jamais cette donnée. Origin + chemin +
// requête (le fragment n'a aucune valeur de diagnostic).
async function getPageUrlFromReferer(): Promise<string | null> {
  const referer = (await headers()).get('referer');
  if (!referer) return null;
  try {
    const url = new URL(referer);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export async function submitFeedback(
  prevState: FeedbackFormState,
  formData: FormData
): Promise<FeedbackFormState> {
  const { session, householdId } = await requireHousehold();

  // Rate limit par utilisateur : 5 retours/heure, quota partagé entre
  // sessions (la clé est l'identifiant du compte en base)
  const { allowed, retryAfterSec } = checkFeedbackRateLimit(session.user.id!);
  if (!allowed) {
    const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
    return {
      success: false,
      message: `Trop de retours envoyés — ${minutes} minute(s) d'attente minimum avant le prochain envoi.`,
    };
  }

  const parsed = feedbackInput.safeParse({
    category: formData.get('category'),
    message: formData.get('message'),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Le retour n'a pas pu être envoyé.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const pageUrl = await getPageUrlFromReferer();
  await createFeedback({
    userId: session.user.id!,
    category: parsed.data.category,
    message: parsed.data.message,
    pageUrl,
    appVersion: pkg.version,
    householdId,
  });

  revalidatePath('/admin/feedback');
  return { success: true, message: 'Merci ! Votre retour a bien été envoyé.' };
}

// Changement de statut depuis la page admin — formulaire serveur (un bouton
// par statut). Entrée ignorée silencieusement si invalide (champs cachés
// énumérés, toute autre valeur vient d'une requête forgée).
export async function changeFeedbackStatus(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const householdId = (admin.user as { householdId?: string }).householdId;
  if (!householdId) return;

  const parsed = feedbackStatusInput.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
  });
  if (!parsed.success) return;

  await updateFeedbackStatus(parsed.data.id, parsed.data.status, householdId);
  revalidatePath('/admin/feedback');
}
