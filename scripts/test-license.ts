import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Test runtime licence/Stripe (vague 3) : webhook signé (HMAC maison), idempotence,
// activation de clé, essai 30 j, garde écriture.

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mealplan-lic-'));
const dbPath = path.join(tmpDir, 'lic.db');
process.env.SQLITE_PATH = dbPath;
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_2026';

let passed = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  passed++;
  console.log(`PASS ${name}`);
}

async function main() {
  execFileSync('npx', ['tsx', 'scripts/db-ensure.ts', path.join(process.cwd(), 'drizzle'), dbPath], { stdio: 'inherit', shell: process.platform === 'win32' });

  const { db } = await import('../lib/db');
  const { users, licenses, licenseAudit } = await import('../lib/db/schema');
  const { eq } = await import('drizzle-orm');
  const Argon2 = (await import('@node-rs/argon2')).default;
  const { POST } = await import('../app/api/stripe/webhook/route');
  const {
    getLicenseStatus, isWriteAllowed, hashLicenseKey, generateLicenseKey, setLicenseStatus,
  } = await import('../lib/license');

  // Un premier compte = début de l'essai
  const hash = await Argon2.hash('x');
  await db.insert(users).values({ email: 'admin@test.local', name: 'Admin', password: hash, role: 'ADMIN' });

  // 1. Sans licence : essai en cours (30 - 0 = 30 jours restants)
  let st = await getLicenseStatus();
  check('essai en cours sans licence', st.kind === 'trial' && (st as any).daysLeft === 30);
  check('écriture autorisée pendant l’essai', await isWriteAllowed());

  // 2. Webhook : signature invalide refusée
  const payload = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', customer: 'cus_test_1', metadata: { cgv_version: 'v1.0', license_date: '2026-11-02' } } },
  });
  const badRes = await POST(new Request('http://x/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 't=1,v1=bidon' },
    body: payload,
  }));
  check('webhook signature invalide -> 400', badRes.status === 400);

  // 3. Webhook signé valide -> licence activée
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', 'whsec_test_secret_2026').update(`${t}.${payload}`).digest('hex');
  const okRes = await POST(new Request('http://x/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': `t=${t},v1=${sig}` },
    body: payload,
  }));
  check('webhook signé -> 200', okRes.status === 200);
  st = await getLicenseStatus();
  check('licence active après webhook', st.kind === 'active');
  const [lic] = await db.select().from(licenses).where(eq(licenses.stripeSessionId, 'cs_test_1'));
  check('clé hashée en base (jamais en clair)', lic.licenseKey.startsWith('sha256:'));
  check('métadonnées CGV tracées', lic.cgvVersion === 'v1.0' && lic.licensedAt === '2026-11-02');
  const [aud] = await db.select().from(licenseAudit).where(eq(licenseAudit.licenseId, lic.id));
  check('audit activated', aud.action === 'activated');

  // 4. Idempotence : même session rejouée
  const replay = await POST(new Request('http://x/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': `t=${t},v1=${sig}` },
    body: payload,
  }));
  const body = await replay.json();
  check('webhook rejoué idempotent (processed=false)', replay.status === 200 && body.processed === false);
  const all = await db.select().from(licenses);
  check('une seule licence créée', all.length === 1);

  // 5. Activation par clé : hash de la clé générée = celle en base ? On ne connaît
  // pas la clé claire (retournée une fois) — on teste avec une clé générée à part
  const clearKey = generateLicenseKey();
  await db.insert(licenses).values({
    licenseKey: hashLicenseKey(clearKey), status: 'active',
    stripeSessionId: 'cs_test_2', licensedAt: new Date().toISOString(),
  });
  check('hash de la clé générée retrouvé (casse normalisée en MP-)', hashLicenseKey(clearKey) === hashLicenseKey(clearKey.toUpperCase()));
  const found = await db.select().from(licenses).where(eq(licenses.licenseKey, hashLicenseKey(clearKey.toUpperCase())));
  check('clé retrouvée après normalisation', found.length === 1);

  // 6. Suspension tracée + écriture bloquée
  await setLicenseStatus(all[0].id, 'suspended', 'Remboursement test', null);
  st = await getLicenseStatus();
  check('licence suspendue -> kind suspended', st.kind === 'suspended');
  // la 2e licence active reste prioritaire? Non : getLicenseStatus prend la 1re par createdAt
  // -> on resuspend la 2e aussi pour tester la garde
  const all2 = await db.select().from(licenses);
  for (const l of all2) if (l.status === 'active') await setLicenseStatus(l.id, 'suspended', 'test', null);
  check('écriture bloquée quand suspendue', !(await isWriteAllowed()));
  const audits = await db.select().from(licenseAudit);
  check('audit suspendu présent', audits.some((a) => a.action === 'suspended' && a.reason === 'Remboursement test'));

  console.log(`\n${passed} tests PASS`);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* base jetable encore ouverte sous Windows */ }
  process.exit(0);
}

main().catch((e) => {
  console.error('FAIL exception', e);
  process.exit(1);
});
