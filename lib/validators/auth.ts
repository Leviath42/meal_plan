import { z } from 'zod';

// Schéma pour l'inscription d'un nouvel utilisateur
export const registerInput = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court (minimum 6 caractères)'),
  name: z.string().min(1, 'Nom requis').max(100),
});

// Types générés automatiquement
export type RegisterInput = z.infer<typeof registerInput>;
