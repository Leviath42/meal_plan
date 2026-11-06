import { execFileSync } from 'node:child_process';
import { createECDH, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Test runtime F10 notifications : base jetable SQLITE_PATH + db-ensure,
// exécution du code de production (lib/notifications.ts — les actions et
// la route API ne font que déléguer à ces mêmes fonctions, leçon C-055
// « pas de réplique divergente »).

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mealplan-notif-'));
const dbPath = path.join(tmpDir, 'notif.db');
process.env.SQLITE_PATH = dbPath;

let passed = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  passed++;
  console.log(`PASS ${name}`);
}

async function main() {
  // shell:true sous Windows : spawnSync('npx') y échoue (ENOENT), npm y
  // expose npx.cmd — le test tourne ainsi aussi en local Windows (C-056)
  execFileSync('npx', ['tsx', 'scripts/db-ensure.ts', path.join(process.cwd(), 'drizzle'), dbPath], { stdio: 'inherit', shell: process.platform === 'win32' });

  const notifications = await import('../lib/notifications');
  const { db } = await import('../lib/db');
  const { users, recipes, mealPlans, pushSubscriptions } = await import('../lib/db/schema');
  const webpush = await import('web-push');

  // --- Fuseau Europe/Paris (indépendant du TZ de la machine) --------------
  // 30/11/2026 06:07 UTC = 07:07 à Paris (heure d'hiver, UTC+1)
  const instant = new Date('2026-11-30T06:07:30Z');
  const dateStr = notifications.getParisDateStr(instant);
  check('date de Paris au format YYYY-MM-JJ', /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && dateStr === '2026-11-30');
  check('heure de Paris au format HH:MM', notifications.getParisTimeStr(instant) === '07:07');

  // --- Comptes de test -----------------------------------------------------
  const [userA] = await db.insert(users).values({ email: 'a@notif.test', password: 'x', role: 'MEMBER' }).returning();
  const [userB] = await db.insert(users).values({ email: 'b@notif.test', password: 'x', role: 'MEMBER' }).returning();
  const [userC] = await db.insert(users).values({ email: 'c@notif.test', password: 'x', role: 'MEMBER' }).returning();

  check('heure de rappel null par défaut (désactivé)', (await notifications.getNotifyTime(userA.id)) === null);

  await notifications.setNotifyTime(userA.id, '07:00');
  await notifications.setNotifyTime(userC.id, '08:30');
  check('heure de rappel persistée pour A', (await notifications.getNotifyTime(userA.id)) === '07:00');

  // Décimal d'heure invalide refusé côté validation (helper métier partagé)
  check('format HH:MM invalidé (25:00)', !notifications.isValidNotifyTime('25:00'));
  check('format HH:MM invalidé (bonjour)', !notifications.isValidNotifyTime('bonjour'));

  // --- Stockage d'abonnement ----------------------------------------------
  const subA = { endpoint: 'https://push.example.test/a', p256dh: 'keyA', auth: 'authA' };
  await notifications.savePushSubscription(userA.id, subA);
  let rows = await db.select().from(pushSubscriptions);
  check('abonnement stocké en base (endpoint, p256dh, auth)', rows.length === 1 && rows[0].endpoint === subA.endpoint && rows[0].p256dh === 'keyA' && rows[0].auth === 'authA');

  // Même endpoint réenregistré (même navigateur, autre compte) : PAS de
  // doublon grâce à la contrainte unique + onConflictDoUpdate
  await notifications.savePushSubscription(userB.id, { ...subA, p256dh: 'keyA2' });
  rows = await db.select().from(pushSubscriptions);
  check('réabonnement du même endpoint = mise à jour, pas de doublon', rows.length === 1 && rows[0].userId === userB.id && rows[0].p256dh === 'keyA2');

  // Restitution de l'endpoint à A, puis un abonnement propre pour B
  // (B reste « désactivé » : notify_time null) et pour C (heure 08:30)
  await notifications.savePushSubscription(userA.id, subA);
  await notifications.savePushSubscription(userB.id, { endpoint: 'https://push.example.test/b', p256dh: 'keyB', auth: 'authB' });
  await notifications.savePushSubscription(userC.id, { endpoint: 'https://push.example.test/c', p256dh: 'keyC', auth: 'authC' });
  check('trois appareils abonnés au total', (await db.select().from(pushSubscriptions)).length === 3);

  // --- Sélection des destinataires ----------------------------------------
  const at0700 = await notifications.listPushRecipients('07:00');
  check('filtrage par heure : seul le compte à 07:00 est retenu', at0700.length === 1 && at0700[0].endpoint === subA.endpoint);
  check('abonné avec notify_time null ignoré (B)', !(await notifications.listPushRecipients()).some((r) => r.userId === userB.id));
  const all = await notifications.listPushRecipients();
  check('sans filtre : tous les abonnés non désactivés (A + C)', all.length === 2);

  // Désactivation de l'heure seulement : l'abonné n'est plus destinataire
  await notifications.setNotifyTime(userC.id, null);
  check('heure passée à null : C retiré des destinataires', (await notifications.listPushRecipients()).length === 1);
  await notifications.setNotifyTime(userC.id, '08:30');

  // --- Repas du jour (lecture du planning existant) -------------------------
  const [recipe] = await db.insert(recipes).values({ title: 'Gratin de pâtes au fromage', prepTime: 15, cookTime: 30, instructions: 'x' }).returning();
  // Soir inséré AVANT Midi pour vérifier l'ordre chronologique du résumé
  await db.insert(mealPlans).values({ date: dateStr, mealType: 'Soir', customNote: 'Restes de gratin' }).run();
  await db.insert(mealPlans).values({ date: dateStr, mealType: 'Midi', recipeId: recipe.id, servings: 4 }).run();

  const payload = await notifications.buildDailyMealPayload(dateStr);
  check('payload construit quand un repas est planifié', payload !== null);
  if (payload) {
    check('titre du repas planifiée dans le résumé', payload.body.includes('Gratin de pâtes au fromage'));
    check('repas sans recette couvert (note manuelle)', payload.body.includes('Restes de gratin'));
    check('ordre chronologique Midi avant Soir', payload.body.indexOf('(Midi)') < payload.body.indexOf('(Soir)'));
    check('préfixe « Aujourd\'hui : »', payload.body.startsWith("Aujourd'hui : "));
  }

  const none = await notifications.buildDailyMealPayload('2000-01-01');
  check('aucun repas planifié : payload null (rien à envoyer)', none === null);

  // --- Requête Web Push réellement construite (mock endpoint) --------------
  // generateRequestDetails est la fonction qu'utilise sendNotification en
  // interne : on vérifie chiffrement + en-têtes VAPID sans émettre de vraie
  // requête réseau (le push réel vers Chrome est couvert par la validation
  // humaine, cf. docs/test-plan-vague-4.md N2). Les clés de chiffrement
  // p256dh = point public non compressé d'une vraie courbe P-256 (65 octets,
  // la taille seule ne suffit pas : le chiffrement ECDH doit réussir),
  // auth = 16 octets aléatoires.
  const vapid = webpush.generateVAPIDKeys();
  const mockP256dh = createECDH('prime256v1').generateKeys().toString('base64url');
  const mockAuth = randomBytes(16).toString('base64url');
  const details = webpush.generateRequestDetails(
    { endpoint: subA.endpoint, keys: { p256dh: mockP256dh, auth: mockAuth } },
    JSON.stringify(payload),
    { vapidDetails: { subject: 'mailto:dev@mealplan.local', publicKey: vapid.publicKey, privateKey: vapid.privateKey }, TTL: 3600 }
  );
  check('requête push ciblée vers l’endpoint stocké', details.endpoint === subA.endpoint);
  check('en-tête Authorization VAPID présent', details.headers.Authorization?.startsWith('vapid '));
  check('charge chiffrée non vide (Content-Length)', Number(details.headers['Content-Length']) > 0);
  check('TTL propagé', String(details.headers.TTL) === '3600');

  // --- Désactivation complète (action /profile) -----------------------------
  check('appareil de A abonné avant désactivation', (await notifications.hasPushSubscription(userA.id)) === true);
  await notifications.removePushSubscriptionsByUser(userA.id);
  await notifications.setNotifyTime(userA.id, null);
  check('désactivation : abonnements de A supprimés', (await notifications.hasPushSubscription(userA.id)) === false);
  check('désactivation : heure A à null', (await notifications.getNotifyTime(userA.id)) === null);
  check('seul C reste destinataire après désactivation de A', (await notifications.listPushRecipients()).every((r) => r.userId === userC.id));

  console.log(`\n${passed} tests PASS`);
  // Meilleur effort : sous Windows la base jetable peut encore être ouverte
  // par better-sqlite3 au nettoyage (EPERM) — dossier temp, non bloquant
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
  process.exit(0);
}

main().catch((e) => {
  console.error('FAIL exception', e);
  process.exit(1);
});
