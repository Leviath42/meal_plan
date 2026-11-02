import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "./lib/auth";

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

export default auth((req) => {
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
    '/login',
    '/register',
    '/public/calendar',
    '/api/calendar',
    '/reset-password',
    '/_next/static',
    '/_next/image',
    '/favicon.ico'
  ];

  // Si authentifié
  if (req.auth) {
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

  return respond(NextResponse.next({ request: { headers: requestHeaders } }));
});

// Le middleware ne doit pas tourner sur les assets statiques ni les routes
// d'authentification de NextAuth : chaque exécution décode le JWT (~1 ms par
// requête) — inutile pour des fichiers immuables.
export const config = {
  matcher: ['/((?!_next/static|_next/image|icons|manifest.json|sw.js|favicon.ico|api/auth).*)'],
};
