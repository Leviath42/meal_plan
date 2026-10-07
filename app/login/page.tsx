"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Ne suivre que les chemins internes : un callbackUrl externe (ou "//host")
  // redirigerait vers un site arbitraire apres connexion (open redirect)
  const rawCallbackUrl = searchParams.get("callbackUrl") || "/";
  const callbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setPending(false);

    if (result?.error) {
      setError("Email ou mot de passe incorrect");
    } else {
      // Redirection complète pour s'assurer que le middleware voit la nouvelle session
      window.location.href = callbackUrl;
    }
  };

  return (
    <main className="min-h-[calc(100vh-3rem)] sm:min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-3">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          <h1 className="text-lg sm:text-xl font-bold text-center text-gray-800 mb-4">
            Connexion à Meal Plan
          </h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-xs sm:text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="ton@email.com"
                required
                autoComplete="email"
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-accent text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {pending ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-4 text-center text-xs sm:text-sm text-gray-600 space-y-2">
            <Link href="/reset-password" className="block text-accent hover:underline">
              Mot de passe oublié ?
            </Link>
            <Link href="/register" className="block text-accent hover:underline">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
