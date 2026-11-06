import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { auth } from "./lib/auth";
import { db } from "./lib/db";
import { users } from "./lib/db/schema";
import { isWriteAllowed } from "./lib/license";

// CSP avec nonce par requête : le nonce est posé sur les en-têtes de la
// requête (lu par le layout via headers() pour le script inline anti-flash
// du thème) et la politique est posée sur la réponse. 'strict-dynamic'
// laisse passer les scripts injectés par Next. En dev : Report-Only.
function buildCsp(): { key: string; value: string; nonce: string } {
  const nonce = randomBytes(16).toString("base64");
  const value = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  const key =
    process.env.NODE_ENV === "production"
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only";
  return { key, value, nonce };
}

export default auth(async (req) => {
  const { key, value, nonce } = buildCsp();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const respond = (res: NextResponse) => {
    res.headers.set(key, value);
    return res;
  };

  const url = req.nextUrl.pathname;

  // Routes publiques toujours accessibles
  const publicRoutes = [
    '/api/auth',
    '/api/health',
    '/api/notifications',
    '/offline',
    '/login',
    '/register',
    '/public/calendar',
    '/api/calendar',
    '/api/stripe',
    '/activate',
    '/reset-password',
    '/_next/static',
    '/_next/image',
    '/favicon.ico'
  ];

  // Si authentifié : vérifier tokenVersion en base — un changement de mot de
  // passe entre-temps révoque la session (redirection vers /login)
  if (req.auth) {
    const claims = (req.auth as unknown as { user?: { id?: string; tokenVersion?: number } }).user;
    if (claims?.id) {
      const [row] = await db
        .select({ tokenVersion: users.tokenVersion })
        .from(users)
        .where(eq(users.id, claims.id))
        .limit(1);
      if (!row || row.tokenVersion !== (claims.tokenVersion ?? 0)) {
        return respond(
          NextResponse.redirect(new URL("/login?session=revoked", req.url))
        );
      }
    }
    return respond(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // Si non authentifié, rediriger vers /login sauf pour les routes publiques
  // (correspondance exacte ou préfixe de chemin AVEC délimiteur : '/login'
  // couvre '/login' et '/login/x', pas '/login-autre-chose')
  const shouldRedirect = !publicRoutes.some(
    (route) => url === route || url.startsWith(route + '/')
  );

  if (shouldRedirect) {
    return respond(
      NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(url)}`, req.url)
      )
    );
  }

  // Garde licence (vague 3) : essai expiré = lecture seule. Les requêtes
  // d'écriture (POST/PUT/DELETE, dont les server actions) hors whitelist sont
  // redirigées vers /activate. L'export et la lecture restent ouverts.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const writeFree = ['/api/auth', '/api/stripe', '/activate', '/login', '/register', '/reset-password', '/api/health'];
    const free = writeFree.some((r) => url === r || url.startsWith(r + '/'));
    if (!free && req.auth) {
      const allowed = await isWriteAllowed();
      if (!allowed) {
        return respond(
          NextResponse.redirect(new URL('/activate?expired=1', req.url))
        );
      }
    }
  }

  return respond(NextResponse.next({ request: { headers: requestHeaders } }));
});

// Le middleware ne doit pas tourner sur les assets statiques ni les routes
// d'authentification de NextAuth : chaque exécution décode le JWT (~1 ms par
// requête) — inutile pour des fichiers immuables.
export const config = {
  matcher: ['/((?!_next/static|_next/image|icons|manifest.json|sw.js|favicon.ico|api/auth).*)'],
};
