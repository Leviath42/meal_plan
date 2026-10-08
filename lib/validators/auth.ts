import { z } from 'zod';

// Schéma pour l'inscription d'un nouvel utilisateur
export const registerInput = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(10, 'Le mot de passe doit faire au moins 10 caractères'),
  name: z.string().min(1, 'Nom requis').max(100),
});

// Types générés automatiquement
export type RegisterInput = z.infer<typeof registerInput>;
