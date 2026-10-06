import { NextResponse } from "next/server";
import { auth } from "./lib/auth";

export default auth((req) => {
  const url = req.nextUrl.pathname;
  
  // Routes publiques toujours accessibles
  const publicRoutes = [
    '/api/auth',
    '/login',
    '/logout',
    '/register',
    '/waiting-validation',
    '/_next/static',
    '/_next/image',
    '/favicon.ico'
  ];
  
  // Si authentifié
  if (req.auth) {
    // Si l'utilisateur est GUEST et n'est pas sur la page waiting-validation, rediriger
    if (req.auth.user?.role === 'GUEST' && !url.startsWith('/waiting-validation')) {
      return NextResponse.redirect(
        new URL('/waiting-validation', req.url)
      );
    }
    return;
  }
  
  // Si non authentifié, rediriger vers /login sauf pour les routes publiques
  const shouldRedirect = !publicRoutes.some(route => 
    url === route || url.startsWith(route + '/') || url.startsWith(route)
  );
  
  if (shouldRedirect) {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(url)}`, req.url)
    );
  }
});
