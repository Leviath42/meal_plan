// GET /settings/export — F18 : téléchargement de l'export JSON complet.
//
// GET volontaire (pas une server action POST) : en essai expiré, la garde du
// proxy (proxy.ts) ne bloque que les écritures (requêtes non-GET) — l'export
// est une lecture et doit rester autorisé même sans licence active (contrat
// vague 3 & 4, scénario E5). L'accès ADMIN est revalidé ici par requireAdmin.
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guards';
import { buildExportEnvelope } from '@/lib/export';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Export réservé aux administrateurs' }, { status: 403 });
  }

  const envelope = await buildExportEnvelope();
  const dateStamp = envelope.exported_at.slice(0, 10);
  const body = JSON.stringify(envelope, null, 2);

  return new NextResponse(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="meal-plan-export-${dateStamp}.json"`,
      // contenu sensible au foyer (planning, recettes) : jamais mis en cache
      'cache-control': 'no-store',
    },
  });
}
