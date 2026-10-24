
# Meal Plan — Plan d'action consolidé : de zéro à 10 000 foyers

*Document maître d'exécution. Il consolide l'étude de marché, les retours d'expérience des échecs du segment, le fonctionnement de Stripe et le dimensionnement serveur. Écrit pour être suivi sans expertise préalable : chaque tâche précise **quoi faire, avec quel outil, à quel coût, en combien de temps**, et ce que tu sous-traites.*

---

## 0. La philosophie : tout sous-traiter sauf le produit

Tu es seul. Ta seule ressource rare est le temps. La règle qui structure tout ce plan :

> **Tout ce qui n'est pas ton code ni ta relation client est acheté à un prestataire** — jamais construit, jamais maintenu par toi.

| Tu fais (ton métier) | Tu sous-traites (le métier des autres) |
|---|---|
| Le produit (Next.js, la base, les recettes) | Le paiement (Stripe) |
| Le contenu (articles SEO, vidéos, réponses) | Les emails transactionnels (Brevo) |
| La relation client (Discord, témoignages) | Les sauvegardes (Litestream + stockage objet) |
| Les décisions (prix, paliers, Go/No-Go) | Le monitoring (UptimeRobot), le DNS/CDN (Cloudflare), la compta (Indy), les CGV (modèle d'avocat) |

Chaque service externe de ce plan est choisi pour son **coût fixe faible et sa maintenance nulle** : tu ne gères aucune des machines, tu les loues prêtes à l'emploi.

---

## 1. La carte du voyage

| Phase | Durée | Objectif en une phrase | Jalon de sortie (Go/No-Go) |
|---|---|---|---|
| **0. Préparation** | Mois 0–1 | Être administrativement, techniquement et commercialement prêt | F07 fiable + onboarding self-service + landing avec 50 inscrits |
| **1. Bêta privée** | Mois 2–3 | 20–40 familles testrices, 5 témoignages | 20 familles actives + import URL qui marche à 90 % |
| **2. Lancement public** | Mois 4 | Premières ventes, séquence communautaire rodée | 10–30 ventes |
| **3. Croissance** | Mois 5–8 | Un canal d'acquisition prévisible | 100 ventes cumulées + 1 canal qui apporte 40 % des essais |
| **Paliers** | Continu | Grandir sans changer d'outils | Voir section 6 |
| **Options** | M9+ | N'ouvrir que sur déclencheur chiffré | Voir section 7 |

Aucune phase ne se lance tant que la précédente n'a pas son jalon. C'est la parade au risque n°1 documenté chez les indépendants : lancer puis arrêter le marketing.

---

## 2. Phase 0 — Préparation (mois 0–1)

### 2.1 Administratif — une demi-journée, ~50 €

| Quoi | Comment (pas à pas) | Coût |
|---|---|---|
| Statut micro-entreprise | Sur le guichet unique de l'INPI (formalites.entreprises.gouv.fr) : activité « vente de licences logicielles / développement », déclaration en ligne, SIREN sous 1–2 semaines. Tu coches « entrepreneur individuel » (micro-entreprise = régime fiscal simplifié de l'EI) | 0 € |
| Compte pro | Néobanque pro (Shine ~10 €/mois) pour séparer perso/pro dès le premier euro | ~10 €/mois |
| Domaine + email | Domaine .fr ou .com (~12 €/an chez OVH), messagerie Zoho Mail (gratuite pour 1 domaine) — evite Google Workspace, inutile au début | ~12 €/an |
| Compta | Indy (gratuit) : il lit tes factures Stripe et préremplit tes déclarations de CA micro-entreprise | 0 € |

**Fiscalité — ce qu'il faut savoir et rien de plus :** tant que ton chiffre d'affaires reste sous 36 800 €/an (services), tu ne factures **aucune TVA** en France. Sur chaque facture : la mention « TVA non applicable, art. 293 B du CGI » (Stripe et Indy la gèrent). Le seul seuil à surveiller au-delà : 10 000 €/an de ventes à des particuliers d'autres pays UE → inscription au guichet OSS sur impots.gouv.fr (une case de plus par trimestre, gérable par Stripe Tax). C'est tout.

### 2.2 Produit — 3 à 4 semaines de dev, le seul vrai chantier

Dans l'ordre de blocage (aucune vente n'est possible avant les trois premiers) :

1. **F07 — Import de recettes par URL** : coller l'adresse d'une recette Marmiton/750g → recette créée avec ingrédients et étapes. Critère de réussite : 10 recettes importées sans retouche.
2. **Multi-foyers (household_id)** : ton schéma actuel est mono-famille (`appSettings` = une ligne, pas de notion de foyer). Ajoute `household_id` aux tables (`recipes`, `mealPlans`, `shoppingItems`, `appSettings`) et rattache chaque requête au foyer de l'utilisateur. Sans ça, impossible d'héberger plusieurs familles sur un serveur. Chantier Drizzle classique : colonnes + index + guards dans les server actions.
3. **Onboarding self-service** : inscription instantanée (supprimer la validation ADMIN), création du foyer, invitations familiales en 2 minutes. C'est la porte d'entrée commerciale.
4. **Essai 30 jours sans carte** + **export JSON complet** en un clic (l'argument de confiance du segment — Yummly et Mealime sont morts en volant les données de leurs users).
5. **F12 — PWA hors-ligne** : la liste de courses doit marcher en magasin sans réseau.

**Ce qui n'est PAS dans cette phase** (et n'y entrera pas avant le palier 1 000 foyers) : stats, garde-manger, notifications, app mobile, multi-langue.

### 2.3 Infra — une demi-journée, ~12 €/mois

Réutilisation maximale : ton `proxmox-install.sh` installe déjà Debian + Node + PM2 + l'app. Les mêmes étapes marchent sur un VPS (un serveur privé virtuel = une machine Linux louée, que tu pilotes en lignes de commande copiées-collées).

| Brique | Outil | Coût | Ce que ça t'évite |
|---|---|---|---|
| Serveur | VPS OVH ou Scaleway 2 vCPU/4 Go (~8 €/mois) — français, argument RGPD ; Hetzner si prix prioritaire | ~8 €/mois | Gérer une machine chez toi (électricité, box, pannes FAI interdites pour un produit payant) |
| DNS + HTTPS + anti-DDoS | Cloudflare (offre gratuite) : tu pointes ton domaine dessus, il protège et cache les fichiers statiques | 0 € | Acheter/configurer des certificats, absorber les attaques |
| Sauvegardes | **Litestream** : un logiciel qui réplique ta base SQLite en continu vers un stockage objet (Scaleway Object Storage). RPO < 1 min, ~2 % CPU, restauration en une commande | ~2 €/mois | Écrire un script de backup, craindre une perte de données |
| Surveillance | UptimeRobot (gratuit) : il ping ton endpoint healthcheck toutes les 5 min et t'envoie un email si le site tombe | 0 € | Regarder toi-même si le site est up |
| Emails transactionnels | Brevo (300 emails/jour gratuits) : inscriptions, réinitialisations | 0 € | Monter un serveur mail (piège n°1 du débutant) |

**Mise en route (2 h, pas à pas)** : commander le VPS → coller le script d'installation adapté → connecter le domaine à Cloudflare → activer Litestream vers le bucket → brancher UptimeRobot → brancher Brevo via leur API SMTP. Une seule règle d'or : **PM2 en mode « fork » (jamais « cluster »)** — SQLite écrit dans un seul fichier, une seule instance Node.

### 2.4 Marketing — une soirée, ~10 €

- **Landing page** sur Framer ou Carrd (~0–10 €/mois) : une phrase de promesse (« votre famille planifie ses repas, partagé, payé une fois, sans abonnement »), 3 captures d'écran, un formulaire d'inscription à la liste d'attente (Tally ou Buttondown, gratuits).
- **Comptes** : Reddit (crée-le maintenant, il a besoin d'historique avant de poster), X.
- **Aucune pub, aucun budget d'acquisition à ce stade.**

### 2.5 Paiement — 2 h en mode test

1. Crée un compte Stripe avec ton SIREN (vérification d'identité en ligne).
2. Reste en **mode test** : tout fonctionne avec de fausses cartes, rien n'est encaissé.
3. Crée le produit « Licence Meal Plan — foyer » (49 €) et le prix early bird (29 €).
4. Génère un **Payment Link** (une page de paiement hébergée par Stripe, zéro code) et configure le **webhook** : quand Stripe confirme un paiement (`checkout.session.completed`), ton backend active le foyer en premium. Deux règles absolues : vérifier la signature, et garantir qu'un même paiement n'active jamais deux fois (Stripe renvoie parfois l'événement en double).
5. La compta et les reçus sont automatiques : Stripe vire sur ton compte pro, enlève ~1,5 % + 0,25 € par paiement français (une licence à 49 € → ~48 € nets).

**Budget total Phase 0 : ~250 € une fois (domaine, template CGV plus loin, mois de VPS) + ~20 €/mois.**

---

## 3. Phase 1 — Bêta privée (mois 2–3)

**Objectif : prouver le produit sur 20–40 familles réelles, récolter 5 témoignages, caler le prix.**

1. **Recrute** via ta liste d'attente, un post « early access, je cherche 20 familles testrices » sur r/SideProject et r/selfhosted, et ton entourage (l'app est familiale — les familles de ton cercle sont des testeurs honnêtes).
2. **Ouvre un Discord** (gratuit) : c'est ton support, ta FAQ future et ta machine à témoignages.
3. **Collecte systématiquement** : les questions posées (→ articles SEO futurs), les bugs, et la métrique clé « ai-je importé mes recettes en moins de 10 minutes ? ».
4. **Teste le prix** en direct : « 29 € early bird puis 49 € : cher, correct, cadeau ? »
5. Maintenance : tu corriges les bugs au fil de l'eau, tu ne développes **aucune** nouvelle fonctionnalité pendant la bêta.

**Go/No-Go : 20 familles actives + import fiable à 90 % + 5 témoignages écrits. Sinon : on itère, on ne lance pas.**

---

## 4. Phase 2 — Lancement public (mois 4)

### 4.1 Les 3 jours précédant la mise en vente

| Quoi | Où | Coût |
|---|---|---|
| CGV conformes B2C (rétractation 14 j, garantie contenus numériques, médiation) | Modèle de CGV logiciel par template d'avocat (Actav, Legalstart…) | ~100–200 € une fois |
| Mentions légales + politique de confidentialité | Généré + relu par toi (nom, SIREN, adresse, contact) | 0 € |
| Stripe basculé en **mode live** | Un bouton dans le dashboard | 0 € |
| Page « vos données, exportables à tout moment » avec capture | Ton site | 0 € |

### 4.2 La séquence de lancement (l'ordre compte plus que le volume)

1. **Semaine 1 — petites plateformes** : Uneed, MicroLaunch, BetaList. But : roder le pitch, récolter de la preuve sociale dans un environnement sans enjeu.
2. **Semaine 2 — Reddit, format histoire** : r/SideProject, r/selfhosted, r/MealPrepSunday. Format : « J'ai construit un planificateur familial sans abonnement parce que Paprika passe les familles au paywall et Mealime ferme en supprimant vos données — voilà où j'en suis, chiffres inclus. » L'honnêteté convertit, le marketing-speak fait bannir. Règle des subreddits : avoir contribué utilement avant de parler de soi.
3. **Semaine 3 — Hacker News (Show HN) + dev.to** : angle « self-hosted-first, pay-once, RGPD, fait en France ».
4. **Semaine 4 — Product Hunt** : avec les témoignages de bêta. C'est un jour d'amplification, pas une stratégie.

**Go/No-Go : 500–1 500 visiteurs, >8 % d'inscriptions à l'essai, 10–30 ventes.**

---

## 5. Phase 3 — Croissance (mois 5–8)

**Objectif : un canal prévisible avant d'ajouter du produit.**

- **SEO comparatif** (le levier n°1 du segment, quasi gratuit) : 1 article toutes les 2 semaines — « Meal Plan vs Paprika », « alternative française à Jow pour vos propres recettes », « récupérer ses recettes Mealime ». Ce sont des requêtes de gens prêts à changer d'outil.
- **Veille des fermetures** (alerte mensuelle « recipe app shut down ») : chaque fermeture = un article + un flux d'orphelins. Mealime ferme le 21 octobre 2026 avec suppression des données : l'opportunité est live.
- **Vidéos courtes** (2/mois, 60 s : le planning de la semaine en drag & drop), TikTok/Shorts — enregistrement d'écran + CapCut, zéro sous-traitance.
- **Communautés en continu** : règle 10 contributions utiles pour 1 mention du produit.
- **Presse micro** : blogs parents/cuisine FR, newsletters — pitch « l'anti-abonnement, hébergé en France ».
- **Pub payante** : interdite avant M7 et avant d'avoir vérifié que 49 € > 3× le coût d'acquisition. Plafond 50 €/mois.

**Go/No-Go : 100 ventes cumulées + un canal qui apporte >40 % des essais, de façon répétée.**

---

## 6. Paliers de croissance — grandir sans rien changer

Le dimensionnement est fait (voir le rapport serveur) : **10 000 foyers ≈ 5 Go de base, 7 req/s en moyenne, un seul serveur**. La croissance se fait donc par *upgrade de la même machine*, jamais par réécriture.

| Palier | Ce qui change (2 clics chacun) | Ce qui ne change PAS | Coût infra/mois |
|---|---|---|---|
| **1–100 foyers** | Rien — tout tient sur le VPS de base | Tout | ~12 € |
| **100–1 000** | VPS un cran au-dessus (redimensionnement OVH/Scaleway) ; Brevo passe payant si >300 emails/j ; FAQ + support communautaire Discord pour absorber les questions | L'architecture, Litestream, Cloudflare, update.sh | ~20 € |
| **1 000–10 000** | VPS 4 vCPU/8 Go ; bucket de sauvegarde plus grand ; inscription OSS si >10 000 €/an de ventes UE ; revue des seuils TVA | **Absolument tout le reste** — c'est le bénéfice du choix SQLite | ~25 € |

**Règle d'or technique : on n'ajoute une brique que le jour où la douleur existe.** Pas de Kubernetes, pas de Postgres (sauf multi-serveurs, qui n'arrivera pas avant bien après 10 000 foyers), pas de microservices. Les 10 000 premiers €/mois de frais d'infra sont une erreur de conception, pas un objectif.

---

## 7. Options — n'ouvrir que sur déclencheur chiffré

| Option | Déclencheur | Quoi | Coût d'entrée |
|---|---|---|---|
| **App mobile (Android/iOS)** | 500+ clients payants | Empaqueter le site avec Capacitor (l'app existante dans un shell natif), APK d'abord | Compte Google Play 25 $ ; Apple Developer 99 $/an ; commission 15 % en store → le web reste le canal de vente (1,5 %) |
| **Localisation anglais** | 300 ventes FR | Le segment pay-once est majoritairement anglophone ; traduction UI + landing EN double le marché adressable | ~0 € (toi + relecture) |
| **Bascule abonnement 9,99 €/an** | One-time <5 % de conversion 3 mois après le lancement | Option B du rapport de prix — réversible | 0 € |
| **Vente hors UE** | >20 % de trafic US/UK | Merchant of Record (Polar, Paddle) : ils deviennent le vendeur légal et gèrent TVA/factures pour 4–8 % | % seulement |
| **Offre cloud gérée « self-hosted »** | Demande récurrente sur r/selfhosted | ~2 €/mois/foyer pour un hébergement géré — capte la communauté sans lui donner le produit | ~0 € (ton infra existante) |
| **Cœur open source** | Palier 10 000 foyers atteint, revenus stables | À re-considérer seulement là — la trajectoire médiane des projets OSS similaires (Recipya…) est le sommeil faute de modèle | — |

---

## 8. Le tableau des sous-traitances — récapitulatif

| Fonction | Service recommandé | Alternative | Coût | Ce que ça t'évite de faire |
|---|---|---|---|---|
| Paiement | **Stripe** | PayPal Checkout (moins bien intégré) | 1,5 % + 0,25 €/paiement FR | Tunnel de paiement, 3DS, reçus, remboursements, litiges, virements |
| Emails transactionnels | **Brevo** | Postmark (~15 $/mois, délivrabilité max) | 0 € (300/j) → ~7 €/mois | Serveur mail, SPF/DKIM, délivrabilité |
| Hébergement | **VPS OVH/Scaleway** | Hetzner (moins cher, non FR) ; PaaS type Railway (~25 €/mois) si tu veux encore moins d'ops | ~8–20 €/mois | Gérer du matériel, de l'uptime, des sauvegardes physiques |
| Sauvegardes | **Litestream + stockage objet** | Backblaze B2 | ~2 €/mois | Scripts de backup, RPO horaire, perte de données |
| DNS/CDN/HTTPS | **Cloudflare** (gratuit) | — | 0 € | Certificats TLS, absorption DDoS, cache |
| Monitoring | **UptimeRobot** | Healthchecks.io | 0 € | Surveiller à la main |
| Landing/formulaires | **Framer/Carrd + Tally + Buttondown** | — | 0–10 €/mois | Développer des pages marketing |
| CGV | **Modèle d'avocat** (Actav, Legalstart) | Rédaction sur mesure | ~100–200 € une fois | Apprendre le droit de la consommation |
| Compta/déclarations | **Indy** | Comptable (~1 000 €/an, seulement si seuils TVA dépassés) | 0 € | Feuille de calcul, calcul du social/IR |
| Support | **Discord communautaire + FAQ** | Help Scout (~$20/mo) au-delà de 1 000 clients | 0 € | Répondre 10 fois à la même question |
| Vidéo | Enregistrement d'écran + **CapCut** | — | 0 € | Montage pro |

---

## 9. Le calendrier de maintenance — le minimum vital

| Fréquence | Durée | Quoi |
|---|---|---|
| **Hebdo** | 15 min | Lire les alertes UptimeRobot + emails Stripe + retours Discord |
| **Mensuel** | 30 min | Déclaration de CA micro (INPI, préremplie par Indy) ; `npm audit` + MAJ des dépendances ; vérifier que Litestream a répliqué récemment ; mettre à jour la landing avec le dernier témoignage |
| **Trimestriel** | 1 h | **Test de restauration** d'une sauvegarde Litestream (la sauvegarde jamais testée n'existe pas) ; revue des KPI de phase ; 1 article SEO de plus |
| **Annuel** | 2 h | Re-vérifier les prix et seuils (grille Stripe, prix VPS, seuils TVA) ; renouveler le domaine ; purge RGPD des comptes inactifs |

**Total : environ 1 à 2 h par mois** hors développement produit. C'est le contrat « minimum de maintenance » : chaque ligne de ce tableau existe parce qu'elle a déjà été sous-traitée au maximum.

---

## 10. Les points de décision Go/No-Go

| Jalon | Critère objectif | Si oui | Si non |
|---|---|---|---|
| Fin Phase 0 | F07 fiable + landing 50 inscrits | Lancer la bêta | Décaler le marketing, finir le produit — on ne lance jamais pour rattraper le produit |
| Fin Phase 1 | 20 familles actives + 5 témoignages | Mettre en vente | Itérer un mois de plus |
| Fin Phase 2 | 10–30 ventes | Phase 3 | Revoir prix (option B) ou ciblage avant d'investir en contenu |
| Phase 3 à M8 | 100 ventes + 1 canal identifié | Paliers + options | Pivot ou arrêt propre (users prévenus, export offert) |
| Référence statistique | ~100 €/mois de revenu récurrent | Projet validé | En dessous : bruit statistique (l'app médiane fait 72 $/mois) |

---

## 11. Budget récapitulatif

| Poste | Phase 0–2 (mois 0–4) | Croissance (mois 5–8) | Palier 10 000 foyers |
|---|---|---|---|
| Admin (CGV, domaine, banque pro) | ~350 € une fois | — | — |
| Infra (VPS, Litestream, email) | ~20 €/mois | ~20 €/mois | ~25 €/mois |
| Marketing | ~10 €/mois (landing) | ~10 €/mois + pub optionnelle ≤50 € | selon volume |
| **Total mensuel** | **~30 €** | **~30–80 €** | **<50 €** |

À rapporter au modèle économique : 100 ventes = 4 900 € encaissés pour moins de 300 € de frais totaux. La contrainte de ce projet n'a jamais été le coût — c'est ton temps, et le plan ci-dessus est talement fait pour le protéger.

---

## Sources principales

- Marché, prix et concurrence : rapport « Étude de marché & plan de mise en marché » (canvas compagnon)
- Échecs du segment (Mealime, Yummly, PlateJoy, Pepperplate, Recipya, RecipeSage) et économie des apps indépendantes : rapport « Échecs du segment & fonctionnement de Stripe » (canvas compagnon)
- Dimensionnement serveur et multi-tenant : conversation du 19/10/2026 (schéma et guide de déploiement du repo meal_plan inspectés)
- Tarifs VPS 2026 : [ComparateurCloud](https://comparateurcloud.fr/vps-8-go-ram/) · [OnetSolutions](https://onetsolutions.net/en/compare/vps-ovh-scaleway-hetzner)
- Litestream : [litestream.io](https://litestream.io/) · [Stratégie de backup SQLite en prod (dev.to)](https://dev.to/helperx/sqlite-backup-strategy-for-production-saas-wal-litestream-recovery-tests-11jg)
- Email : [Tarifs Brevo](https://www.brevo.com/fr/pricing/)
- Fiscalité : [Service-Public — franchise TVA](https://entreprendre.service-public.gouv.fr/vosdroits/F21746) · [Le guichet unique OSS (l-expert-comptable)](https://www.l-expert-comptable.com/a/532222-le-mini-guichet-unique-de-tva.html)
