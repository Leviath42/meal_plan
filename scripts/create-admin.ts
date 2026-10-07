// scripts/create-admin.ts
// Cree un compte administrateur. Usage :
//   npm run create-admin -- <email> <motdepasse>
//   ou variables d'environnement ADMIN_EMAIL / ADMIN_PASSWORD
import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import Argon2 from '@node-rs/argon2';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> <mot de passe>');
    console.error('   ou definissez ADMIN_EMAIL et ADMIN_PASSWORD');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('Le mot de passe doit faire au moins 6 caracteres');
    process.exit(1);
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    console.log('Un utilisateur existe deja avec cet email:', existing.email);
    process.exit(1);
  }

  const hashedPassword = await Argon2.hash(password);

  await db.insert(users).values({
    email,
    name: 'Administrateur',
    password: hashedPassword,
    role: 'ADMIN',
  });

  console.log('Utilisateur admin cree:', email);
}

(async () => {
  try {
    await createAdmin();
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
})();
