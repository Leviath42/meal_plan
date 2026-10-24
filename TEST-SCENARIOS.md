# TEST-SCENARIOS — Parcours métier à vérifier avant commercialisation

> Catalogue vivant des scénarios fonctionnels à tester avant lancement. Lié à
> `PLAN-ACTION-10K-FOYERS.md` (les scénarios font partie des critères Go/No-Go)
> et `PLAN-COMMERCIALISATION.md`.
>
> Chaque scénario : prérequis → étapes → résultat attendu. Un scénario validé
> est marqué ✅ avec la date. Un scénario qui révèle un bug passe ❌ + issue.
> Les points nécessitant une **décision produit** sont marqués 🔀 et remontent
> dans la section « Décisions ouvertes ».

## 1. Adhésion & foyer

### S01 — Inscription self-service
- **Prérequis** : aucun compte, validation ADMIN supprimée.
- **À vérifier** : inscription email + mot de passe, création du foyer, aucune intervention admin, email de bienvenue envoyé.
- **Attendu** : foyer utilisable immédiatement, sans validation manuelle.

### S02 — Invitation puis adhésion d'un membre
- **Prérequis** : S01 validé, foyer propriétaire existant.
- **À vérifier** : envoi invitation, adhésion du membre, rattachement au bon `household_id`, accès partagé aux recettes/planifications.
- **Attendu** : le membre voit le foyer partagé, pas un foyer vide.

### S03 — Réinitialisation de mot de passe
- **À vérifier** : demande par email, lien à validité limitée, connexion ensuite.
- **Attendu** : token à usage unique, expiration, aucune fuite sur les autres membres.

### S04 — Expiration de l'essai 30 jours sans achat
- **À vérifier** : état du foyer à J+30 sans paiement, message affiché, relance email.
- **Attendu** : dégradation claire (pas de perte de données), chemin d'achat évident.
- 🔀 **Décision produit** : que garde-t-on accessible en essai expiré ? (lecture seule ? export ?)

## 2. Paiement

### S05 — Achat de licence bout en bout
- **Prérequis** : Stripe Checkout configuré, webhook actif.
- **À vérifier** : paiement 29/49 €, réception `checkout.session.completed`, vérification signature, activation premium du foyer.
- **Attendu** : premium actif en < 1 min après paiement, reçu envoyé.

### S06 — Webhook dupliqué / signature invalide
- **À vérifier** : rejouer le même webhook, falsifier la signature, webhook hors délai.
- **Attendu** : idempotence (pas de double activation), rejet des signatures invalides, log de l'anomalie.

### S07 — Paiement refusé
- **À vérifier** : carte refusée, abandon du Checkout, expiration du lien.
- **Attendu** : message clair, pas d'activation, le foyer reste en essai, possibilité de retenter.

## 3. Rétractation & remboursement

### S08 — Demande de remboursement < 14 jours
- **À vérifier** : demande client (email ou formulaire), délai de traitement, refund Stripe, confirmation.
- **Attendu** : remboursé sous 14 jours calendaires (engagement CGV), traçabilité complète.

### S09 — Refund partiel ou total côté Stripe
- **À vérifier** : refund depuis le dashboard Stripe (hors app), synchronisation de l'état premium.
- **Attendu** : l'app reflète l'état réel Stripe même si le refund est fait côté dashboard.

### S10 — Données du foyer après remboursement
- 🔀 **Décision produit requise avant test** : accès complet gratuit ? lecture seule + export ? suppression ?
- **À vérifier** : cohérence entre CGV, app et réalité technique.
- **Attendu** : comportement écrit dans les CGV et conforme dans l'app.

## 4. Réclamation & support

### S11 — Réclamation client jusqu'à l'escalade médiateur
- **À vérifier** : réclamation reçue, réponse documentée, escalade médiateur possible avec le dossier complet (échanges, CGV versionnées).
- **Attendu** : process écrit et suivi (délais, qui répond, que fournit-on au médiateur).

### S12 — Accès admin aux données sur ticket support
- **À vérifier** : accès limité au strict nécessaire, tracé (quoi, quand, pourquoi).
- **Attendu** : politique de confidentialité respectée, journal d'accès consultable.

## 5. Cycle de vie des données

### S13 — Export JSON complet puis ré-import
- **À vérifier** : export recettes + planifications + listes + paramètres, ré-import dans un foyer neuf.
- **Attendu** : ré-import à l'identique (anti-fermeture + conformité portabilité RGPD).

### S14 — Suppression de compte
- **À vérifier** : demande de suppression, cascade SQL (toutes tables liées), délai 30 jours, email de confirmation.
- **Attendu** : aucune donnée orpheline, suppression complète y compris auth/sessions.

### S15 — Suppression vs sauvegardes
- 🔀 **Décision produit requise** : rétention des sauvegardes Litestream à définir (rotation), mention dans la politique de confidentialité.
- **À vérifier** : après suppression, les sauvegardes vieillissent et purgent bien les données.
- **Attendu** : cohérence RGPD entre app et backups, engagement écrit.

### S16 — Suppression d'un membre par le propriétaire
- **À vérifier** : recettes/listes créées par le membre supprimé, planifications le concernant.
- **Attendu** : pas de perte inattendue pour le foyer, comportement documenté.

### S17 — Mise à jour des responsables / rôles
- **À vérifier** : changement de rôle (membre → responsable), transfert de propriété du foyer, permissions reflétées partout.
- **Attendu** : pas de foyer orphelin, l'ancien propriétaire redevient membre sans perdre ses données.

### S18 — Recette supprimée alors qu'elle est planifiée/partagée
- **À vérifier** : suppression par membre A d'une recette planifiée par membre B.
- **Attendu** : comportement défini (blocage ? confirmation ? planification marquée orpheline ?) et constant.

### S19 — Import de recettes par URL (F07)
- **À vérifier** : source affichée, gestion des échecs (site protégé, 404), contenu tiers (photos, droits).
- **Attendu** : import propre, mention de la source, pas de contenu copyrighté recopié tel quel.

## 6. Ops & pérennité

### S20 — PWA hors-ligne (F12)
- **À vérifier** : liste de courses en mode avion depuis mobile, ré-sync au retour réseau.
- **Attendu** : fonctionnel en magasin sans réseau, pas de perte au ré-sync.

### S21 — Restauration de sauvegarde Litestream
- **À vérifier** : restauration réelle sur un environnement de test depuis le dernier snapshot objet.
- **Attendu** : base restaurée exploitable, RTO/RPO mesurés et documentés.

### S22 — Migration multi-tenant
- **À vérifier** : migration `household_id` sur une copie des données de production familiales, avant/après.
- **Attendu** : zéro perte, zéro doublon, tous les rattachements corrects.

### S23 — Sonde `/api/health`
- **À vérifier** : `SELECT 1` → 200/503, route **exclue du middleware auth** (`proxy.ts`), vue saine par Uptime Kuma.
- **Attendu** : la supervision reflète l'état réel de l'app, pas un contournement sur `/login`.

## 7. Décisions ouvertes (à trancher avant la bêta)

| # | Décision | Impact | Statut |
|---|----------|--------|--------|
| D1 | Accès du foyer après essai expiré (S04) | Onboarding, conversion | ⬜ ouvert |
| D2 | Données du foyer après remboursement (S10) | CGV, support | ⬜ ouvert |
| D3 | Rétention des sauvegardes vs suppression RGPD (S15) | Conformité, politique de confidentialité | ⬜ ouvert |
| D4 | Comportement recette partagée supprimée (S18) | UX foyer multi-membres | ⬜ ouvert |

## 8. Maintenance de cette liste

- Chaque chantier de la phase 0 ajoute ses scénarios **avant** d'être fusionné.
- Un scénario validé est daté ; un scénario qui casse en prod rouvre une entrée.
- Les scénarios de cette liste sont des critères d'entrée du Go/No-Go de lancement.
