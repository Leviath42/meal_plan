import { NextResponse } from "next/server";
import { auth } from "./lib/auth";

// Configurer le runtime pour éviter l'Edge Runtime (qui ne supporte pas better-sqlite3)
export const runtime = "nodejs";

export default auth((req) => {
  // Si non authentifié, rediriger vers /login
  if (!req.auth) {
    const url = req.nextUrl.pathname;
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(url)}`, req.url)
    );
  }
});

export const config = {
  matcher: [
    // Protéger toutes les routes SAUF :
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login|register|logout).*)",
  ],
};
