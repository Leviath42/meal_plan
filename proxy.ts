import { NextResponse } from "next/server";
import { auth } from "./lib/auth";

export default auth((req) => {
  // Si non authentifié, rediriger vers /login
  if (!req.auth) {
    const url = req.nextUrl.pathname;
    
    // Ne pas rediriger pour ces routes
    const publicRoutes = [
      '/api/auth',
      '/login',
      '/logout',
      '/register',
      '/_next/static',
      '/_next/image',
      '/favicon.ico'
    ];
    
    const shouldRedirect = !publicRoutes.some(route => 
      url === route || url.startsWith(route + '/') || url.startsWith(route)
    );
    
    if (shouldRedirect) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(url)}`, req.url)
      );
    }
  }
});
