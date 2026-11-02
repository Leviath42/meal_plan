import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { licenses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { activateFromStripeSession, setLicenseStatus } from '@/lib/license';

// Webhook Stripe (Payment Link / Checkout) — vérification de signature maison
// (HMAC-SHA256 de `${t}.${payload}`, en-tête Stripe-Signature: t=…,v1=…),
// zéro dépendance externe. Idempotent : stripe_session_id est unique en base.
// Hors middleware auth : déclaré public côté proxy (route /api/stripe).

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET manquant — webhook refusé');
    return Response.json({ error: 'non configuré' }, { status: 500 });
  }

  const payload = await request.text();
  const header = request.headers.get('stripe-signature') ?? '';
  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i), kv.slice(i + 1)];
    })
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return Response.json({ error: 'signature absente' }, { status: 400 });

  // Anti-rejeu : timestamp dans les 5 dernières minutes
  const ts = parseInt(t, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return Response.json({ error: 'timestamp hors délai' }, { status: 400 });
  }

  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: 'signature invalide' }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return Response.json({ error: 'payload invalide' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object ?? {};
    const result = await activateFromStripeSession({
      stripeSessionId: String(session.id ?? ''),
      stripeCustomerId: session.customer ? String(session.customer) : null,
      cgvVersion: session.metadata?.cgv_version ?? null,
      licenseDate: session.metadata?.license_date ?? null,
    });
    if (!result) return Response.json({ error: 'session invalide' }, { status: 400 });
    // La clé claire n'est logguée que côté Stripe (email au client) — jamais ici
    console.log('Licence activée (session', session.id, result.alreadyProcessed ? 'déjà traitée' : 'nouvelle', ')');
    return Response.json({ received: true, processed: !result.alreadyProcessed });
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data?.object ?? {};
    // Retrouve la licence par customer si possible, sinon ignore (log)
    const rows = await db
      .select()
      .from(licenses)
      .where(eq(licenses.stripeCustomerId, String(charge.customer ?? '')))
      .limit(1);
    if (rows.length > 0) {
      await setLicenseStatus(rows[0].id, 'suspended', 'Remboursement Stripe (charge.refunded)', null);
      console.log('Licence suspendue après remboursement (charge', charge.id, ')');
    }
    return Response.json({ received: true });
  }

  // Événements ignorés (payment failed, etc.)
  return Response.json({ received: true });
}
