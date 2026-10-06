"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get("error");
      if (errorParam === 'pending') {
        return 'Votre compte est en attente de validation par un administrateur.';
      }
    }
    return null;
  });
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);

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
      // Vérifier si l'URL contient déjà error=pending (compte non validé)
      const urlParams = new URLSearchParams(window.location.search);
      const currentError = urlParams.get("error");
      
      // Ne pas écraser le message si c'est une erreur de compte non validé
      if (currentError !== 'pending') {
        setError("Email ou mot de passe incorrect");
      }
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Connexion à Meal Plan
          </h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="ton@email.com"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {pending ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            <Link href="/register" className="text-blue-600 hover:underline">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
