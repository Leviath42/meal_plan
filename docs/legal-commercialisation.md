# Dossier légal — commercialisation de Meal Plan

*Version : 1.0 — 24 octobre 2026. Trame rédigée avec assistance IA, à faire relire par un avocat après les 20-30 premières ventes (décision actée du plan de commercialisation). Ce document est un point de départ, pas un conseil juridique.*

---

## 1. Structure & fiscalité

- **Statut** : micro-entreprise, activité « vente de licences logicielles B2C » (code APE 5829 ou 6202B). Immatriculation en ligne, gratuite, ~15 min.
- **TVA** : franchise en base tant que CA < 36 800 EUR/an (services), tolérance 41 250 EUR. Mention obligatoire sur chaque facture/reçu : « TVA non applicable, art. 293 B du CGI ».
- **Facturation électronique** : déploiement 2026-2027 ; en B2C à cette échelle, quasi sans impact — les reçus générés par Stripe suffisent.
- **Déclarations** : URSSAF (cotisations sur le CA encaissé), déclaration de revenus n°2042-C-PRO.

## 2. Mentions légales (modèle à publier sur le site)

- Éditeur : [Prénom NOM], micro-entrepreneur, SIREN [xxx], domicile [adresse complète]
- Contact : email professionnel + formulaire de contact
- Directeur de la publication : [Prénom NOM]
- Hébergement : auto-hébergé sur infrastructure personnelle ; nom du registrar du domaine + contact
- Aucun traitement de paiement réalisé sur le site (redirection Stripe)

## 3. CGV (trame adaptée — licence à vie)

1. **Objet** : vente d'une licence d'usage du logiciel Meal Plan, non exclusive, non transférable, sans redistribution, pour un foyer.
2. **Prix** : 29 EUR (early bird, 3 premiers mois) puis 49 EUR ; paiement unique par carte via Stripe ; essai complet 30 jours sans carte.
3. **Rétractation & remboursement** : droit de rétractation légal de 14 jours ; pour l'exécution immédiate du contenu numérique, renonciation expresse demandée à l'achat. **Garantie commerciale plus forte que le légal : remboursement inconditionnel 14 jours**, sans justification.
4. **Livraison / accès** : activation immédiate du foyer premium après paiement (webhook checkout.session.completed).
5. **Support** : correction de bugs et mises à jour inclus à vie ; support par email, engagement de réponse raisonnable, sans SLA contractuel.
6. **Pérennité (sunset policy)** : engagement public — en cas d'arrêt du service, le serveur est open-sourcé ; l'app PWA et l'export JSON rendent le serveur non critique pour l'usage quotidien.
7. **Données personnelles** : renvoi vers la politique de confidentialité (RGPD).
8. **Médiation de la consommation** : identification du médiateur (cf. §6) + modalités de saisine.
9. **Droit applicable** : droit français ; tribunaux compétents du domicile du vendeur.
10. **Langue, intégralité, modifications** : information par email au moins 30 jours avant tout changement défavorable.

## 4. RGPD

- **Responsable de traitement** : la micro-entreprise. Pas de DPO obligatoire à cette échelle.
- **Registre des traitements** (à tenir même en micro) : comptes & authentification (exécution du contrat), recettes/plannings familiaux (exécution du contrat), sauvegardes (intérêt légitime / sécurité), retours clients (intérêt légitime — amélioration produit), emails transactionnels (exécution du contrat).
- **Base légale** : exécution du contrat pour l'essentiel ; aucun profilage, aucune publicité, aucun partage marketing.
- **Durées** : compte actif = durée de la licence ; export et suppression de compte en libre-service ; suppression effective sous 30 jours, à l'exception des sauvegardes chiffrées (rétention bornée — décision D3 à trancher).
- **Sous-traitants** : Stripe (paiement, art. 28), Cloudflare (tunnel/CDN), éventuel prestataire email transactionnel. Les mentionner dans la politique de confidentialité.
- **Localisation** : hébergement personnel (UE) + sauvegardes R2 (UE). Jamais de données non chiffrées poussées (rclone crypt).
- **Violation de données** : qualifier, contenir, notifier la CNIL sous 72 h si risque pour les personnes, informer les concernés.
- **Cookies** : uniquement des cookies strictement nécessaires (session) ; pas de traceurs publicitaires ; pas de bandeau requis si la politique le documente.

## 5. Accessibilité (European Accessibility Act)

- Le règlement UE 2019/885 (EAA) s'applique depuis le 28 juin 2025 au e-commerce et aux services numériques : CGV, tunnel d'achat et informations produit doivent être accessibles.
- **Déclaration d'accessibilité** à publier (modèle DINUM) : état de conformité réel, non-conformités connues, schéma de remédiation.
- **État produit** : contrastes WCAG AA vérifiés (F14 thèmes), navigation clavier et focus visibles livrés (audit UI/UX d29bb64). Reste : audit complet WCAG 2.1 AA sur le parcours d'achat avant lancement.
- Le public Paprika/Mela est fortement sensible à l'accessibilité : c'est un argument de vente autant qu'une obligation.

## 6. Médiation de la consommation — sélection chiffrée

Obligation art. L.612-1 du code de la consommation : tout professionnel vendant à des consommateurs doit adhérer à un dispositif **référencé par la CECMC** et le mentionner sur le site et dans les CGV. La micro-entreprise n'est pas exonérée ; l'adhésion doit être effective avant la première vente.

| Dispositif | Adhésion | Coût par médiation | Notes |
|---|---|---|---|
| **CM2C** (recommandé) | ~48 EUR / 3 ans (< 10 salariés) | ~36 EUR (à distance) | Généraliste, très adopté par les petites entreprises et e-commerces, saisine en ligne, délai 90 j |
| SMP (Médiation Professionnelle) | ~25 EUR HT / 3 ans (< 60 000 EUR CA) | 150-350 EUR HT selon complexité | Moins cher à l'adhésion mais beaucoup plus cher au dossier |
| Médiateur FEVAD | Couplé à l'adhésion à la fédération e-commerce | inclus via fédération | Pertinent plus tard ; l'adhésion fédération n'est pas prioritaire |
| ANM / Médicys / autres | variables | variables | Généralistes, à comparer si CM2C évolue |

**Recommandation : CM2C** — le plus adapté à une micro-entreprise logicielle : coût d'entrée quasi nul, facturation seulement si un litige survient, notoriété rassurante pour le client.

À faire :
1. Adhérer avant la première vente ; conserver l'attestation (preuve exigible en contrôle DGCCRF).
2. Afficher les coordonnées du médiateur sur le site (page dédiée) et dans les CGV.
3. La médiation est gratuite pour le client ; le refus de participer est sanctionné.

## 7. Propriété intellectuelle

- **Marque** : dépôt INPI « Meal Plan » (~190 EUR / 10 ans). La protection la plus forte, plus que le code. À faire avant lancement public, après vérification de disponibilité du nom.
- **Licence du code** : recommandation FSL-1.1 (source-available, conversion automatique Apache/MIT après 2 ans) — cohérente avec la sunset policy. Décision à acter avant lancement.
- Vérifier la disponibilité du nom avant le dépôt INPI (base INPI + recherche web + stores).

## 8. Protection des mineurs

App à usage familial : les comptes invités peuvent appartenir à des mineurs. Points simples : pas de collecte au-delà du nécessaire (pas de date de naissance), pas de publicité, mentions claires dans la politique de confidentialité. Si des comptes « enfants » dédiés voient le jour : consentement parental pour les moins de 15 ans (loi française, art. 45 RGPD).

## 9. Checklist Go/No-Go légal (avant la première vente)

- [ ] Micro-entreprise immatriculée, SIREN obtenu
- [ ] Mentions légales publiées sur le site
- [ ] CGV publiées (trame §3 complétée) + lien au moment du paiement
- [ ] Médiateur CM2C : adhésion effective + mention sur le site + dans les CGV
- [ ] Politique de confidentialité publiée (registre à jour en interne)
- [ ] Renonciation expresse à la rétractation pour contenu numérique affichée au checkout
- [ ] Déclaration d'accessibilité publiée (EAA)
- [ ] Marque déposée à l'INPI (ou décision de dépôt post-lancement documentée)
- [ ] Licence du code actée et fichier LICENSE publié
- [ ] Procédure RGPD opérationnelle : export compte, suppression compte, email dédié pour les demandes DSAR

## Sources

- Service-Public : franchise TVA, médiation de la consommation (art. L612-1)
- economie.gouv.fr/mediation-conso : liste des médiateurs référencés CECMC
- CM2C : tarifs publics professionnels
- CNIL : registre des traitements, notification de violation, âge du consentement
- Directive (UE) 2019/885 + schéma de déclaration d'accessibilité (DINUM)
