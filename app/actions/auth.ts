'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, passwordResetTokens } from '@/lib/db/schema';
import { registerInput } from '@/lib/validators/auth';
import Argon2 from '@node-rs/argon2';
import { eq, count } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendPasswordResetEmail } from '@/lib/email';

export type FormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
} | null;

// Hash le mot de passe avec Argon2
async function hashPassword(password: string): Promise<string> {
  return await Argon2.hash(password);
}

export async function registerUser(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // Parse et valide les données avec Zod
  const parsed = registerInput.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { email, password, name } = parsed.data;

  // Vérifier si l'email existe déjà
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    return { errors: { email: ['Cet email est déjà utilisé'] } };
  }

  try {
    // Hash du mot de passe
    const hashedPassword = await hashPassword(password);

    // Créer l'utilisateur avec rôle GUEST (à valider par l'admin)
    await db.insert(users).values({
      email,
      name: name.trim(),
      password: hashedPassword,
      role: 'GUEST', // Par défaut, l'utilisateur est GUEST jusqu'à validation
    });

    revalidatePath('/register');
    return { success: true, message: 'Compte créé avec succès. Attendez la validation par un administrateur.' };
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    return { errors: { form: ['Une erreur est survenue lors de la création du compte'] } };
  }
}

export async function updateUserRole(
  userId: string,
  newRole: 'ADMIN' | 'MEMBER' | 'GUEST',
  sessionUserId?: string
): Promise<FormState> {
  const session = await auth();
  const currentUserId = sessionUserId || session?.user?.id;

  // Empêcher de modifier son propre compte (sauf pour ajouter un rôle plus élevé)
  if (userId === currentUserId && newRole !== 'ADMIN') {
    return { errors: { form: ['Vous ne pouvez pas modifier votre propre rôle'] } };
  }

  try {
    await db
      .update(users)
      .set({ role: newRole, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId));

    revalidatePath('/register');
    return { success: true, message: `Rôle mis à jour avec succès en ${newRole}` };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rôle:', error);
    return { errors: { form: ['Erreur lors de la mise à jour du rôle'] } };
  }
}

export async function deleteUser(userId: string, sessionUserId?: string): Promise<FormState> {
  const session = await auth();
  const currentUserId = sessionUserId || session?.user?.id;

  // Empêcher la suppression de soi-même
  if (userId === currentUserId) {
    return { errors: { form: ['Vous ne pouvez pas supprimer votre propre compte'] } };
  }

  // Empêcher la suppression du dernier admin
  const [userToDelete] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (userToDelete?.role === 'ADMIN') {
    const [adminsCount] = await db.select({ count: count() })
      .from(users)
      .where(eq(users.role, 'ADMIN'))
      .limit(1);
    
    if (adminsCount.count <= 1) {
      return { errors: { form: ['Impossible de supprimer le dernier administrateur'] } };
    }
  }

  try {
    await db.delete(users).where(eq(users.id, userId));

    revalidatePath('/register');
    return { success: true, message: 'Utilisateur supprimé avec succès' };
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return { errors: { form: ['Erreur lors de la suppression'] } };
  }
}

// Récupérer tous les utilisateurs (pour l'admin)
export async function getAllUsers() {
  return await db.select().from(users).orderBy(users.createdAt);
}

// Récupérer un utilisateur par ID
export async function getUserById(id: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return user;
}

export async function updateUserPassword(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  
  if (!session?.user) {
    return { errors: { form: ['Vous devez être connecté pour changer votre mot de passe'] } };
  }

  const userId = formData.get('userId') as string;
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  // Vérifier que l'ID correspond à l'utilisateur connecté
  if (userId !== session.user.id) {
    return { errors: { form: ['Vous ne pouvez changer que votre propre mot de passe'] } };
  }

  // Récupérer l'utilisateur actuel
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { errors: { form: ['Utilisateur non trouvé'] } };
  }

  // Vérifier le mot de passe actuel
  const isValidPassword = await Argon2.verify(user.password, currentPassword);
  
  if (!isValidPassword) {
    return { errors: { currentPassword: ['Mot de passe actuel incorrect'] } };
  }

  try {
    // Hash du nouveau mot de passe
    const hashedPassword = await hashPassword(newPassword);

    // Mettre à jour le mot de passe
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId));

    // Note: La déconnexion sera gérée côté client pour éviter les problèmes avec Server Actions

    return { 
      success: true, 
      message: 'Mot de passe mis à jour avec succès. Veuillez vous reconnecter.' 
    };
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    return { errors: { form: ['Une erreur est survenue lors du changement de mot de passe'] } };
  }
}

// Générer un token aléatoire sécurisé
function generateResetToken(): string {
  return crypto.randomUUID();
}

// Durée de validité du token : 1 heure
const RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 heure en millisecondes

// Demander une réinitialisation de mot de passe
export async function requestPasswordReset(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get('email') as string;

  if (!email) {
    return { errors: { email: ['Email requis'] } };
  }

  // Trouver l'utilisateur par email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    // Ne pas révéler que l'email existe ou non pour des raisons de sécurité
    // Retourner un message générique
    return { 
      success: true, 
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' 
    };
  }

  // Supprimer les anciens tokens pour cet utilisateur
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, user.id));

  // Générer un nouveau token
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY).toISOString();

  // Stocker le token en base de données
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  // Construire le lien de réinitialisation
  const appUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  const resetLink = `${appUrl}/reset-password?token=${token}`;

  // Envoyer l'email (en mode dev, cela affichera juste dans la console)
  const emailSent = await sendPasswordResetEmail(email, resetLink);

  // Toujours retourner un message générique pour des raisons de sécurité
  return { 
    success: true, 
    message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' 
  };
}

// Réinitialiser le mot de passe avec un token
export async function resetPassword(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const token = formData.get('token') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // Validation
  if (!token) {
    return { errors: { form: ['Token manquant'] } };
  }

  if (!newPassword || newPassword.length < 6) {
    return { errors: { newPassword: ['Le mot de passe doit faire au moins 6 caractères'] } };
  }

  if (newPassword !== confirmPassword) {
    return { errors: { confirmPassword: ['Les mots de passe ne correspondent pas'] } };
  }

  // Trouver le token valide
  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);

  if (!resetToken) {
    return { errors: { form: ['Token de réinitialisation invalide ou expiré'] } };
  }

  // Vérifier la date d'expiration
  if (new Date(resetToken.expiresAt) < new Date()) {
    // Supprimer le token expiré
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return { errors: { form: ['Token de réinitialisation expiré'] } };
  }

  // Hash du nouveau mot de passe
  const hashedPassword = await hashPassword(newPassword);

  // Mettre à jour le mot de passe de l'utilisateur
  await db
    .update(users)
    .set({ password: hashedPassword, updatedAt: new Date().toISOString() })
    .where(eq(users.id, resetToken.userId));

  // Supprimer le token utilisé (à usage unique)
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token));

  return { 
    success: true, 
    message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' 
  };
}

