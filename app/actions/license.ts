'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin, requireSession } from '@/lib/auth-guards';
import { licenses, licenseAudit } from '@/lib/db/schema';
import { getLicenseStatus, hashLicenseKey, setLicenseStatus } from '@/lib/license';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const keySchema = z.object({
  key: z.string().min(10).max(30).regex(/^MP-[A-Z0-9-]+$/i, 'Format MP-XXXX-XXXX-XXXX-XXXX attendu'),
});

export type LicenseFormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
} | null;

// Activation par saisie de la clé reçue après achat
export async function activateLicense(
  prevState: LicenseFormState,
  formData: FormData
): Promise<LicenseFormState> {
  const session = await requireSession();
  const parsed = keySchema.safeParse({ key: String(formData.get('key') ?? '').trim().toUpperCase() });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const hashed = hashLicenseKey(parsed.data.key);
  const [row] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.licenseKey, hashed))
    .limit(1);
  if (!row) {
    return { errors: { key: ['Clé de licence invalide.'] } };
  }
  if (row.status === 'revoked') {
    return { errors: { key: ['Cette licence a été révoquée. Contactez le support.'] } };
  }
  if (row.status === 'suspended') {
    return { errors: { key: ['Cette licence est suspendue (remboursement/litige). Contactez le support.'] } };
  }
  revalidatePath('/');
  void session;
  return { success: true, message: 'Licence activée. Merci ! Toutes les fonctionnalités sont débloquées.' };
}

export async function getLicensesForAdmin() {
  await requireAdmin();
  const rows = await db
    .select()
    .from(licenses)
    .orderBy(desc(licenses.createdAt));
  const auditRows = await db
    .select()
    .from(licenseAudit)
    .orderBy(desc(licenseAudit.at));
  return { licenses: rows, audit: auditRows };
}

export async function suspendLicenseAction(licenseId: string, reason: string) {
  const session = await requireAdmin();
  await setLicenseStatus(licenseId, 'suspended', reason || null, session.user.id);
  revalidatePath('/admin/licenses');
  return { success: true, message: 'Licence suspendue (données conservées).' };
}

export async function reactivateLicenseAction(licenseId: string) {
  const session = await requireAdmin();
  await setLicenseStatus(licenseId, 'reactivated', null, session.user.id);
  revalidatePath('/admin/licenses');
  return { success: true, message: 'Licence réactivée.' };
}

export async function getPublicLicenseStatus() {
  return getLicenseStatus();
}
