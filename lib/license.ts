import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { licenses, licenseAudit, users } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

// Licence par foyer — une instance = un foyer (vague 3).
// Règle figée (contrat vague 3) : aucune licence active → essai de 30 jours
// depuis la création du premier compte, puis LECTURE SEULE (les écritures
// sont bloquées par la garde dans proxy.ts, l'export reste autorisé).

export const TRIAL_DAYS = 30;

export type LicenseStatus =
  | { kind: 'active' }
  | { kind: 'suspended'; reason: string | null }
  | { kind: 'trial'; daysLeft: number }
  | { kind: 'expired' };

export function hashLicenseKey(clearKey: string): string {
  return `sha256:${createHash('sha256').update(clearKey.trim()).digest('hex')}`;
}

export function generateLicenseKey(): string {
  // Format lisible : MP-XXXX-XXXX-XXXX-XXXX (base32 sans ambiguïté)
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let group = '';
    const bytes = randomBytes(4);
    for (let i = 0; i < 4; i++) group += alphabet[bytes[i] % alphabet.length];
    groups.push(group);
  }
  return `MP-${groups.join('-')}`;
}

// Date de début de l'essai : création du premier compte (le foyer démarre là)
async function trialStart(): Promise<Date> {
  const [first] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.createdAt))
    .limit(1);
  return first?.createdAt ? new Date(first.createdAt) : new Date();
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
  const [row] = await db
    .select()
    .from(licenses)
    .orderBy(asc(licenses.createdAt))
    .limit(1);

  if (row?.status === 'active') return { kind: 'active' };
  if (row?.status === 'suspended') return { kind: 'suspended', reason: row.suspensionReason };
  if (row?.status === 'revoked') return { kind: 'expired' };

  // Pas de licence : essai de 30 jours
  const start = await trialStart();
  const daysLeft = Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - start.getTime()) / 86_400_000));
  if (daysLeft > 0) return { kind: 'trial', daysLeft };
  return { kind: 'expired' };
}

export async function isWriteAllowed(): Promise<boolean> {
  const status = await getLicenseStatus();
  return status.kind === 'active' || status.kind === 'trial';
}

// Appelé par le webhook Stripe à chaque achat réussi (idempotent via
// stripe_session_id). Retourne la clé claire UNE SEULE FOIS (à communiquer
// au client), ou null si déjà traitée.
export async function activateFromStripeSession(params: {
  stripeSessionId: string;
  stripeCustomerId?: string | null;
  cgvVersion?: string | null;
  licenseDate?: string | null;
}): Promise<{ licenseKey: string; alreadyProcessed: boolean } | null> {
  const existing = await db
    .select()
    .from(licenses)
    .where(eq(licenses.stripeSessionId, params.stripeSessionId))
    .limit(1);
  if (existing.length > 0) {
    return { licenseKey: '', alreadyProcessed: true };
  }

  const clearKey = generateLicenseKey();
  const now = new Date().toISOString();
  const key = db.transaction((tx) => {
    const lic = tx
      .insert(licenses)
      .values({
        licenseKey: hashLicenseKey(clearKey),
        status: 'active',
        cgvVersion: params.cgvVersion ?? null,
        licensedAt: params.licenseDate ?? now,
        stripeSessionId: params.stripeSessionId,
        stripeCustomerId: params.stripeCustomerId ?? null,
      })
      .returning({ id: licenses.id })
      .get();
    tx.insert(licenseAudit).values({
      licenseId: lic.id,
      action: 'activated',
      reason: 'Achat Stripe (checkout.session.completed)',
    }).run();
    return lic.id;
  });
  void key;
  return { licenseKey: clearKey, alreadyProcessed: false };
}

// Suspension / réactivation admin — toujours tracée dans license_audit
export async function setLicenseStatus(
  licenseId: string,
  action: 'suspended' | 'reactivated' | 'revoked',
  reason: string | null,
  byUserId: string | null
): Promise<void> {
  const now = new Date().toISOString();
  db.transaction((tx) => {
    const patch: Record<string, unknown> = { updatedAt: now };
    if (action === 'suspended') {
      patch.status = 'suspended';
      patch.suspendedAt = now;
      patch.suspensionReason = reason;
    } else if (action === 'reactivated') {
      patch.status = 'active';
      patch.reactivatedAt = now;
      patch.suspensionReason = null;
    } else {
      patch.status = 'revoked';
    }
    tx.update(licenses).set(patch).where(eq(licenses.id, licenseId)).run();
    tx.insert(licenseAudit)
      .values({ licenseId, action, reason, byUserId })
      .run();
  });
}
