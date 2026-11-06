import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { feedback } from '@/lib/db/schema';
import { ensurePrimaryHousehold } from '@/lib/household';
import { rateLimit } from '@/lib/rate-limit';

// F15 — Retours clients. Ce module porte la validation ET les écritures de la
// feature : le test runtime (`scripts/test-feedback.ts`) exécute ces mêmes
// fonctions, jamais une réplique divergente (leçon C-055 — un test qui
// réécrit la requête voit un vert de façade). Les server actions de
// `app/actions/feedback.ts` ne font que les gardes de session/rôle et
// l'extraction du contexte HTTP (referer, version).
//
// F17 (C-062) : les retours sont isolés par foyer (contrat 4b §1.1) — les
// server actions passent le foyer de session ; l'argument optionnel (tests
// runtime historiques, base mono-foyer) retombe sur le foyer principal via
// le backfill idempotent.

// --- Catégories du formulaire (3 clics : catégorie → message → envoyer) ---
export const FEEDBACK_CATEGORIES = ['bug', 'idee', 'question', 'prix'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  idee: 'Idée',
  question: 'Question',
  prix: 'Prix',
};

// --- Statuts de tri admin (nouveau → trié → traité/rejeté) ---
export const FEEDBACK_STATUSES = ['nouveau', 'trie', 'traite', 'rejete'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  nouveau: 'Nouveau',
  trie: 'Trié',
  traite: 'Traité',
  rejete: 'Rejeté',
};

// --- Rate limit : 5 retours par utilisateur et par heure ---
export const FEEDBACK_MAX_PER_HOUR = 5;

export function checkFeedbackRateLimit(userId: string): { allowed: boolean; retryAfterSec: number } {
  return rateLimit(`feedback:${userId}`, FEEDBACK_MAX_PER_HOUR, 60 * 60 * 1000);
}

// --- Validation des entrées serveur ---
export const feedbackInput = z.object({
  category: z.enum(FEEDBACK_CATEGORIES, 'Catégorie invalide'),
  message: z
    .string()
    .trim()
    .min(1, 'Le message ne peut pas être vide')
    .max(1000, 'Maximum 1000 caractères'),
});

export const feedbackStatusInput = z.object({
  id: z.string().min(1, 'Identifiant manquant'),
  status: z.enum(FEEDBACK_STATUSES, 'Statut invalide'),
});

// --- État renvoyé par le Server Action du formulaire (style shopping.ts) ---
export type FeedbackFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
} | null;

// pageUrl et appVersion sont capturés côté serveur (referer HTTP et version
// de package.json) : le client ne fournit que la catégorie et le message.
// La longueur de pageUrl est bornée par prudence (texte informatif).
const PAGE_URL_MAX_LENGTH = 500;

export async function createFeedback(input: {
  userId: string;
  category: FeedbackCategory;
  message: string;
  pageUrl?: string | null;
  appVersion?: string | null;
  householdId?: string;
}): Promise<typeof feedback.$inferSelect> {
  const pageUrl = input.pageUrl ? input.pageUrl.slice(0, PAGE_URL_MAX_LENGTH) : null;
  const appVersion = input.appVersion ?? null;
  const householdId = input.householdId ?? ensurePrimaryHousehold();
  const [row] = await db
    .insert(feedback)
    .values({
      userId: input.userId,
      category: input.category,
      message: input.message,
      pageUrl,
      appVersion,
      householdId,
      // statut par défaut « nouveau » (défini dans le schéma 0008)
    })
    .returning();
  if (!row) throw new Error("Échec de l'enregistrement du retour");
  return row;
}

// Changement de statut côté admin — borné au foyer (C-062) ; renvoie false si
// l'identifiant est inconnu (ou n'appartient pas au foyer passé)
export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
  householdId?: string
): Promise<boolean> {
  const hid = householdId ?? ensurePrimaryHousehold();
  const rows = await db
    .update(feedback)
    .set({ status })
    .where(and(eq(feedback.id, id), eq(feedback.householdId, hid)))
    .returning({ id: feedback.id });
  return rows.length > 0;
}
