# État des lieux — fonctions nécessaires à la commercialisation

*Version : 1.0 — 24 octobre 2026. Croisement de la roadmap v3.11, du cahier des charges v1.6, du plan de commercialisation (§6) et des scénarios de test S01-S23. Document vivant : cocher au fur et à mesure.*

---

## 1. Le chemin critique (rappel)

Le client paye pour trois écrans : **import de recettes → planning familial partagé → liste de courses en magasin**. Tout le reste est secondaire à la décision d'achat.

## 2. Bloquants — rien n'est encaissé sans eux

| # | Fonction | État au 24/10/2026 | Reste à faire | Estimation |
|---|---|---|---|---|
| 1 | **F07 — Import de recettes par URL** | Non commencé | Extraction Schema.org, parse Marmiton/750g, prévisualisation, message si site non supporté | 2-3 j |
| 2 | **Onboarding self-service** | Incompatible aujourd'hui | Comptes « en attente de validation ADMIN » → inscription instantanée + création foyer + invitations familiales (S01) | 1-2 j |
| 3 | **F12 — PWA hors-ligne (données)** | Partie 1 livrée (installable, coquille) | Cache des recettes/ingrédients, calendrier consultable hors ligne, sync au retour en ligne | 1-2 j |
| 4 | **Page marketing + démo vidéo 90 s** | Non commencé | Landing, page tarif (TCO 3 ans), démo drag & drop → liste de courses | 2-3 j (hors vidéo) |
| 5 | **Paiement Stripe** | Non branché | Payment Link/Checkout, webhook checkout.session.completed (signature + idempotence), activation du foyer premium | 1-2 j |
| 6 | **Export/import complet JSON** | Partiel (F04 partage, export liste) | Export/import de tout le foyer : recettes, planning, ingrédients, réglages — argument RGPD + anti-cloud | 1 j |

**Total du chemin critique : ~8-13 jours de solo-dev.**

## 3. Importants avant lancement public (pas avant la bêta privée)

| # | Sujet | État | Pourquoi |
|---|---|---|---|
| 7 | Sonde /api/health + moniteur Uptime Kuma dédié | Manquant (sonde sur /login) | Vérifier que le service commercial est réellement up ; chaîne d'alerte Kuma → HA → téléphone à tester de bout en bout |
| 8 | Sauvegarde hors machine (Litestream → R2) | Todo acté 24/10 | Une base client payante ne peut pas vivre sur du single-disk sans backup externe (RTO 2 h / RPO 24 h, cf. plan-de-reprise.md) |
| 9 | Releases SemVer (tags + notes) | 1 tag last-stable | Confiance : le client payeur doit savoir ce qui change |
| 10 | CSP complète + sessions révocables | Connu, non traité | Hygiène sécurité au moment où des inconnus arrivent sur l'app |
| 11 | FR/EN (i18n) | Non commencé | Le segment pay-once est majoritairement anglophone ; phase 3 du plan |
| 12 | F15 — Retours clients (feedback) | Ajouté à la roadmap v3.11 | La bêta n'apprend rien sans canal de retour ; les enquêtes tranchent les décisions prix actées (39 EUR si « cher ») |

## 4. Non bloquants (ne pas s'y arrêter)

F10 notifications, F11 garde-manger, F13 stats (livré), OAuth (en attente), thèmes F14 (livré) — le commercial ne se juge pas sur ça.

## 5. Décisions produit à trancher avant la bêta

Reprises de test-scenarios.md : D1 accès après essai expiré, D2 données après remboursement, D3 rétention des sauvegardes vs RGPD, D4 recette partagée supprimée. Les scénarios S01-S23 restent des critères d'entrée du Go/No-Go.

## 6. Synthèse

- **Socle fonctionnel : ~2/3 conforme** (audit du 24 oct. 2026) ; le tiers restant est concentré et connu : ~8-13 jours de travail pour débloquer la mise en vente.
- **Priorité 1 sans conteste : F07 (import URL)** — porte d'entrée de tout client venu de Marmiton/Paprika, argument massue contre la saisie manuelle.
- Enchaînement recommandé : F07 → onboarding self-service → Stripe → F12 données → export JSON → page marketing. La bêta privée peut démarrer dès F07 + onboarding.
