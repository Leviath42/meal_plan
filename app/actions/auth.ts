'use server';

import { auth } from '@/lib/auth';
import { requireAdmin } from '@/lib/auth-guards';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { registerInput } from '@/lib/validators/auth';
import Argon2 from '@node-rs/argon2';
import { eq, count } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


export type FormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
} | null;

// Hash le mot de passe avec Argon2
async function hashPassword(password: string): Promise<string> {
  return await Argon2.hash(password);
}

// Hash la réponse secrète avec Argon2 (même algorithme que le mot de passe)
async function hashSecurityAnswer(answer: string): Promise<string> {
  return await Argon2.hash(answer);
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
  newRole: 'ADMIN' | 'MEMBER' | 'GUEST'
): Promise<FormState> {
  const session = await requireAdmin();
  const currentUserId = session.user.id;

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


export async function deleteUser(userId: string): Promise<FormState> {
  const session = await requireAdmin();
  const currentUserId = session.user.id;

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
  await requireAdmin();
  return await db.select().from(users).orderBy(users.createdAt);
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

// Mettre à jour la question secrète pour un utilisateur
export async function updateUserSecurityQuestion(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  
  if (!session?.user) {
    return { errors: { form: ['Vous devez être connecté pour mettre à jour votre question secrète'] } };
  }

  const userId = formData.get('userId') as string;
  const securityQuestion = formData.get('securityQuestion') as string;
  const securityAnswer = formData.get('securityAnswer') as string;

  // Vérifier que l'ID correspond à l'utilisateur connecté
  if (userId !== session.user.id) {
    return { errors: { form: ['Vous ne pouvez modifier que votre propre question secrète'] } };
  }

  // Validation
  if (!securityQuestion || securityQuestion.trim().length === 0) {
    return { errors: { securityQuestion: ['La question secrète est requise'] } };
  }

  if (!securityAnswer || securityAnswer.trim().length < 3) {
    return { errors: { securityAnswer: ['La réponse doit faire au moins 3 caractères'] } };
  }

  try {
    // Hash de la réponse
    const hashedAnswer = await hashSecurityAnswer(securityAnswer);

    // Mettre à jour la question secrète et la réponse hashée
    await db
      .update(users)
      .set({
        securityQuestion: securityQuestion.trim(),
        securityAnswerHash: hashedAnswer,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId));

    return { 
      success: true, 
      message: 'Question secrète mise à jour avec succès.' 
    };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la question secrète:', error);
    return { errors: { form: ['Une erreur est survenue'] } };
  }
}

// Réinitialiser le mot de passe via question secrète
export async function resetPasswordWithSecurityQuestion(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get('email') as string;
  const securityAnswer = formData.get('securityAnswer') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // Validation
  if (!email) {
    return { errors: { email: ['Email requis'] } };
  }

  if (!newPassword || newPassword.length < 6) {
    return { errors: { newPassword: ['Le mot de passe doit faire au moins 6 caractères'] } };
  }

  if (newPassword !== confirmPassword) {
    return { errors: { confirmPassword: ['Les mots de passe ne correspondent pas'] } };
  }

  // Trouver l'utilisateur par email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    // Ne pas révéler que l'email existe ou non
    return { 
      success: true, 
      message: 'Si cet email existe et a une question secrète configurée, le mot de passe a été réinitialisé.' 
    };
  }

  // Vérifier que l'utilisateur a une question secrète configurée
  // Toujours retourner un message générique pour ne pas révéler l'existence de l'email
  if (!user.securityQuestion || !user.securityAnswerHash) {
    return { 
      success: true,
      message: 'Si cet email existe et a une question secrète configurée, la réinitialisation est en cours.'
    };
  }

  // Vérifier la réponse secrète
  const isValidAnswer = await Argon2.verify(user.securityAnswerHash, securityAnswer);
  
  if (!isValidAnswer) {
    return { errors: { securityAnswer: ['Réponse incorrecte'] } };
  }

  try {
    // Hash du nouveau mot de passe
    const hashedPassword = await hashPassword(newPassword);

    // Mettre à jour le mot de passe
    await db
      .update(users)
      .set({ 
        password: hashedPassword, 
        updatedAt: new Date().toISOString() 
      })
      .where(eq(users.id, user.id));

    return { 
      success: true, 
      message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' 
    };
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    return { errors: { form: ['Une erreur est survenue'] } };
  }
}

// Récupérer la question secrète d'un utilisateur (pour l'afficher dans la page de réinitialisation)
export async function getUserSecurityQuestion(email: string) {
  const [user] = await db
    .select({
      securityQuestion: users.securityQuestion,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Toujours retourner un message générique pour ne pas révéler l'existence de l'email
  if (!user?.securityQuestion) {
    return { 
      securityQuestion: null, 
      message: 'Si cet email existe et a une question secrète, elle sera affichée.' 
    };
  }

  return { 
    securityQuestion: user.securityQuestion,
    hasSecurityQuestion: true
  };
}
