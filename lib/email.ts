import nodemailer from 'nodemailer';

// Type pour les options de configuration email
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

// Configuration par défaut (peut être écrasée par les variables d'environnement)
const defaultConfig: EmailConfig = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
  from: process.env.SMTP_FROM || '"Meal Plan" <no-reply@mealplan.local>',
};

// Vérifier si la configuration est complète
function isEmailConfigured(): boolean {
  return !!(defaultConfig.host && defaultConfig.auth.user && defaultConfig.auth.pass);
}

// Créer le transporteur Nodemailer (lazy load)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport(defaultConfig);
  }

  return transporter;
}

/**
 * Envoyer un email de réinitialisation de mot de passe
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
): Promise<boolean> {
  // En mode développement sans SMTP configuré, afficher le lien dans la console
  if (!isEmailConfigured()) {
    console.log('\n' + '='.repeat(60));
    console.log('[DEV MODE] Password reset email would be sent to:', email);
    console.log('[DEV MODE] Reset link:', resetLink);
    console.log('='.repeat(60) + '\n');
    return true;
  }

  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.error('Email transporter not configured');
      return false;
    }

    // Test la connexion SMTP
    await transporter.verify();

    // Envoyer l'email
    await transporter.sendMail({
      from: defaultConfig.from,
      to: email,
      subject: 'Réinitialisation de votre mot de passe - Meal Plan',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Réinitialisation du mot de passe</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Réinitialisation de votre mot de passe</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé une réinitialisation de votre mot de passe pour Meal Plan.</p>
          <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
          <p style="margin: 20px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p>Ce lien expirera dans 1 heure et ne peut être utilisé qu'une seule fois.</p>
          <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Cordialement,<br>
            L'équipe Meal Plan
          </p>
        </body>
        </html>
      `,
      text: `
Réinitialisation de votre mot de passe - Meal Plan

Bonjour,

Vous avez demandé une réinitialisation de votre mot de passe pour Meal Plan.

Cliquez sur le lien suivant pour créer un nouveau mot de passe :
${resetLink}

Ce lien expirera dans 1 heure et ne peut être utilisé qu'une seule fois.

Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.

Cordialement,
L'équipe Meal Plan
      `,
    });

    console.log(`Password reset email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

/**
 * Vérifier si le service email est configuré
 */
export function isEmailServiceConfigured(): boolean {
  return isEmailConfigured();
}

export { EmailConfig };
