import NextAuth from "next-auth";
import { db } from "./db";
import { users } from "./db/schema";
import Argon2 from "@node-rs/argon2";
import { eq } from "drizzle-orm";

// Type pour l'utilisateur avec rôle typé
interface UserWithRole {
  id: string;
  email: string;
  name: string | null;
  password: string;
  role: "ADMIN" | "MEMBER" | "GUEST";
  createdAt: string;
  updatedAt: string;
}

// Fonction pour vérifier que le rôle est valide
function isValidRole(role: string): role is "ADMIN" | "MEMBER" | "GUEST" {
  return ["ADMIN", "MEMBER", "GUEST"].includes(role);
}

// Secret pour signer les cookies JWT
// IMPORTANT: AUTH_SECRET est requis en production, le fallback ne sert qu'en dev
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET est requis en production. Définissez cette variable d'environnement.");
  }
  return secret || "dev-secret-change-in-production";
}

// Configuration principale de NextAuth
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: getAuthSecret(),

  // Configuration de la session
  session: {
    strategy: "jwt", // Stockage dans JWT (alternative: "database" pour stocker en base)
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },

  // Pages personnalisées
  pages: {
    signIn: "/login", // Page de connexion
    error: "/login", // Page d'erreur
  },

  // Callbacks pour étendre le token et la session
  callbacks: {
    // 1. Étendre le token JWT avec le rôle utilisateur
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore - user.role est de type string mais vient de la base avec l'enum
        token.role = user.role;
      }
      return token;
    },

    // 2. Étendre la session avec les infos utilisateur
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        // @ts-ignore - token.role est compatible avec session.user.role
        session.user.role = token.role;
      }
      return session;
    },
  },

  // Fournisseurs d'authentification
  providers: [
    // Stratégie "credentials" = email + password
    {
      id: "credentials",
      name: "Credentials",
      type: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 1. Trouver l'utilisateur par email
        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            password: users.password,
            role: users.role,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1) as UserWithRole[];

        if (!user) {
          console.log("Auth: User not found for email:", credentials.email);
          return null; // Email non trouvé
        }

        // 2. Vérifier le mot de passe avec Argon2
        const isValid = await Argon2.verify(
          user.password,
          credentials.password as string
        );

        if (!isValid) {
          console.log("Auth: Invalid password for user:", user.email);
          return null; // Mot de passe incorrect
        }

        // 3. Empêcher la connexion des utilisateurs GUEST (non validés)
        if (user.role === "GUEST") {
          console.log("Auth: GUEST user cannot login, must be validated first:", user.email);
          return null; // Empêcher la connexion des GUEST
        }

        // 4. Retourner l'utilisateur (sans le password)
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      },
    },
  ],
});

// Types étendus pour la session
declare module "next-auth" {
  interface User {
    role?: "ADMIN" | "MEMBER" | "GUEST";
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role?: "ADMIN" | "MEMBER" | "GUEST";
      securityQuestion?: string | null;
    };
  }
  
  interface JWT {
    id: string;
    role?: "ADMIN" | "MEMBER" | "GUEST";
    securityQuestion?: string | null;
  }
}
