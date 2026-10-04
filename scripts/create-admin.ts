import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import Argon2 from '@node-rs/argon2';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  const email = "admin@mealplan.local";
  const password = "admin123"; // À changer en production !

  // Vérifier si l'admin existe déjà
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    console.log("⚠️ Un utilisateur admin existe déjà:", existing.email);
    return;
  }

  // Hacher le mot de passe
  const hashedPassword = await Argon2.hash(password);

  // Créer l'utilisateur
  await db.insert(users).values({
    email,
    name: "Administrateur",
    password: hashedPassword,
    role: "ADMIN",
  });

  console.log("✅ Utilisateur admin créé avec succès !");
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log("   ⚠️ Pense à changer le mot de passe après la première connexion !");
}

// Exécuter le script
(async () => {
  try {
    await createAdmin();
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
})();
