import { z } from 'zod';

// Schéma pour l'inscription d'un nouvel utilisateur
export const registerInput = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court (minimum 6 caractères)'),
  name: z.string().min(1, 'Nom requis').max(100),
});

// Schéma pour la mise à jour du profil utilisateur
export const updateProfileInput = z.object({
  name: z.string().min(1, 'Nom requis').max(100).optional(),
  email: z.string().email('Email invalide').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Mot de passe trop court (minimum 6 caractères)').optional(),
});

// Types générés automatiquement
export type RegisterInput = z.infer<typeof registerInput>;
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;
