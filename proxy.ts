import { NextResponse } from "next/server";
import { auth } from "./lib/auth";

export default auth((req) => {
  const url = req.nextUrl.pathname;
  
  // Routes publiques toujours accessibles
  const publicRoutes = [
    '/api/auth',
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
    return;
  }
  
  // Si non authentifié, rediriger vers /login sauf pour les routes publiques
  // (correspondance exacte ou préfixe de chemin AVEC délimiteur : '/login'
  // couvre '/login' et '/login/x', pas '/login-autre-chose')
  const shouldRedirect = !publicRoutes.some(
    (route) => url === route || url.startsWith(route + '/')
  );
  
  if (shouldRedirect) {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(url)}`, req.url)
    );
  }
});

// Le middleware ne doit pas tourner sur les assets statiques ni les routes
// d'authentification de NextAuth : chaque exécution décode le JWT (~1 ms par
// requête) — inutile pour des fichiers immuables.
export const config = {
  matcher: ['/((?!_next/static|_next/image|icons|manifest.json|sw.js|favicon.ico|api/auth).*)'],
};
