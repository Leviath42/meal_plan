
# Meal Plan — Étude de marché & plan de mise en marché

*Rapport préparé pour Nicolas — octobre 2026. Hypothèse de départ : produit en l'état (app web auto-hébergée Next.js), zéro audience, zéro structure, zéro budget marketing.*

---

## 1. Synthèse exécutive

- **Verdict : marché réel, mais de niche.** Le segment « je possède mes recettes, sans abonnement, avec ma famille » est prouvé par Paprika, Mela et Recipe Keeper. Ce n'est pas un marché de startup, c'est un marché d'indépendant — viser quelques milliers d'euros/mois, pas une levée de fonds.
- **La fenêtre : Paprika 4.** La référence du segment vieillit et bascule vers un modèle hybride avec abonnement, en mettant le partage familial derrière le paywall. Un challenger moderne, familial inclus, pay-once, a une carte à jouer maintenant.
- **Terrain à éviter : le grand public gratuit** (Jow, 9–10 M d'utilisateurs, monétisé par les enseignes) et **le self-hosted open source** (Mealie, Tandoor : gratuits, culture du gratuit). Meal Plan doit se vendre comme **produit propriétaire familial**, pas comme outil de geek.
- **Condition non négociable avant de vendre : l'import de recettes par URL (F07).** C'est la porte d'entrée du segment. Sans elle, pas de conversion.
- **Trajectoire recommandée : web d'abord** (Stripe, ~1,5 % de frais vs 15 % dans les stores), **licence à vie par foyer ~49 €**, lancement par paliers communautaires, mobile ensuite.

---

## 2. Le marché en chiffres


| Indicateur                               | Valeur                                           | Lecture pour Meal Plan                                           |
| ---------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| Marché mondial meal planning apps (2025) | ~1,8 Md $, CAGR ~12,5 %                        | Le gâteau grossit, mais…                                         |
| Part du modèle freemium                  | 44,8 %                                           | Le standard est « gratuit + premium »                            |
| Part des apps gratuites                  | 72,6 % du segment                                | La masse ne paie pas. Cible = la minorité qui paie pour posséder |
| Prix moyen d'une app payante du segment  | 2,99–14,99 $ (mobile), jusqu'à 29,99 $ (desktop) | Fourchette de prix validée par le marché                         |


Sources : [Dataintelo](https://dataintelo.com/report/meal-planning-app-market), [Straits Research](https://straitsresearch.com/report/recipe-apps-market).

---

## 3. Analyse concurrentielle

### 3.1 Le tableau complet


| Acteur                            | Segment                 | Prix                                              | Modèle                                | Forces                                                 | Faiblesses exploitables                                                                                        |
| --------------------------------- | ----------------------- | ------------------------------------------------- | ------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Jow** (FR/US)                   | Grand public            | Gratuit                                           | Monétisation drive/enseignes          | 9–10 M utilisateurs, exécution parfaite, budget énorme | Recettes imposées (pas les tiennes), pas de bibliothèque perso, pas de vrai planning familial, pub/affiliation |
| **Paprika 3/4**                   | Pay-once individuel     | 4,99 $ mobile, 29,99 $ desktop **par plateforme** | Achat unique, bascule abonnement (v4) | La référence historique, import web solide, offline    | Vieillissant ; achat séparé par plateforme ; **partage familial derrière abonnement en v4**                    |
| **Mela**                          | Pay-once Apple-only     | 6,99 $ iOS, 14,99 $ Mac                           | Achat unique                          | Très beau, sync iCloud                                 | Apple only, pas de planning familial multi-plateforme                                                          |
| **Recipe Keeper Pro**             | Pay-once cross-platform | 19,99 $ iOS                                       | Achat unique par plateforme           | Multi-plateforme                                       | UX datée                                                                                                       |
| **Plan to Eat**                   | Abonnement planning     | ~49 $/an                                         | Abonnement                            | Planning calendrier mature                             | Pas de try-before-buy (réticence récurrente), abonnement uniquement                                            |
| **Mealie / Tandoor / KitchenOwl** | Self-hosted OSS         | Gratuit                                           | Open source                           | Communauté r/selfhosted fidèle, données chez soi       | Installation technique, UX inégale, **ces utilisateurs ne paieront jamais**                                    |
| **Samsung Food / Yummly**         | Écosystème              | Freemium                                          | Géants                                | Distribution massive                                   | Généristes, pas centrés « ta bibliothèque familiale »                                                          |


Sources : [Useladle](https://www.useladle.com/blog/paprika-alternative), [Drizzle Lemons](https://www.drizzlelemons.com/blog/recipe-apps-without-subscriptions), [Ultimate Meal Plans](https://ultimatemealplans.com/reviews/paprika), [Recipe One](https://www.recipeone.app/blog/best-recipe-manager-apps), [Wikipédia — Jow](https://fr.wikipedia.org/wiki/Jow.fr), [Cooklang](https://cooklang.org/blog/42-tandoor-vs-mealie-vs-kitchenowl/).

### 3.2 Ce que personne ne fait bien aujourd'hui

Le croisement de trois besoins reste mal servi :

1. **Planning familial réel** — comptes multiples dans un même foyer, rôles, page publique « invités » (grands-parents, nounou). Paprika 4 le facture en abonnement ; Mealie/Tandoor le font mais demandent un serveur.
2. **Pay-once multi-plateforme** — Paprika fait payer chaque plateforme séparément ; le foyer mixte Android/iOS paie 3–4 fois.
3. **Données à soi sans serveur à gérer** — entre Jow (cloud + affiliation) et Tandoor (Docker à installer), il n'y a rien de simple.

**C'est exactement le triangle de Meal Plan.**

---

## 4. Positionnement

### 4.1 Promesse (une phrase)

> « Votre famille planifie ses repas, partage recettes et courses, sur tous vos appareils — payé une fois, sans abonnement, sans pub. »

### 4.2 Persona cible primaire

- **Foyer organisé, 2 adultes + enfants**, mixte Android/iOS, déjà sur Jow ou Marmiton mais frustré de ne pas utiliser *leurs* recettes.
- N'est **pas** développeur : n'installera jamais Docker. C'est ce qui l'empêche d'adopter Mealie/Tandoor.
- Paie déjà 5–15 € pour des apps utilitaires de qualité sans abonnement.

### 4.3 Persona secondaire

- Utilisateur self-hosted qui veut une instance gérée (offre « cloud de l'éditeur » en option payante) ou qui reste sur l'open source — **ne pas construire le produit pour lui, mais ne pas l'ignorer** : c'est ton canal de relance initial.

### 4.4 Les trois règles de différenciation


| Règle                                           | Contre-argument                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| **Familial inclus, pas facturé**             | vs Paprika 4 (abonnement) et AnyList (plan famille payant)                    |
| Un achat pour tout le foyer, toutes plateformes | vs Paprika (par plateforme), Mela (Apple only)                                |
| Export complet de tes données à tout moment     | vs tout le cloud closed-source — argument de confiance décisif pour ce public |


---

## 5. Stratégie de prix

### 5.1 Recommandation : licence à vie par foyer


| Paramètre                              | Valeur                             | Justification                                                                                              |
| -------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Prix de lancement (early bird, 3 mois) | **29 €**                           | Compatible « achat plaisir », sous le seuil de réflexion de Paprika complet                                |
| Prix standard                          | **49 € / foyer**                   | Milieu de fourchette Plan to Eat (49 $/an) vs Recipe Keeper (19,99 $) ; le foyer le justifie (4–6 comptes) |
| Version d'essai                        | Complète 30 jours, sans carte      | La réticence n°1 sur Plan to Eat est l'abonnement sans essai                                               |
| Garantie                               | Remboursé 14 jours, sans condition | Obligatoire en B2C France, et argument de conversion                                                       |
| Futur mobile                           | Inclus dans la licence             | « Une licence, tout le foyer, tous les appareils » — le revers de la médaille des concurrents              |


### 5.2 Option B (à garder en réserve) : 9,99 €/an par foyer

Avantage : revenu récurrent, plus facile à vendre à l'unité. Inconvénient : te replace dans le monde « abonnement » que ta cible fuit, et te met en concurrence frontale avec Plan to Eat. **À ne choisir que si le one-time ne convertit pas après 3 mois.**

### 5.3 Offre hébergement « cloud » (plus tard, M6+)

- ~2 €/mois/foyer pour l'instance gérée hébergée chez un hébergeur européen (Scaleway/OVH — argument RGPD/français). Cible : le persona self-hosted sans serveur. ~70 % de marge après hébergement.

### 5.4 Défense du prix (réponse à l'objection « 50 €, c'est cher »)

**1. Le vrai prix, c'est le coût total par foyer sur 3 ans** — pas l'étiquette. Comparaison pour un foyer type (2 téléphones + 1 PC) :

| Produit | Coût 3 ans (foyer) | Partage familial | Multi-plateforme |
| --- | --- | --- | --- |
| **Meal Plan** | **49 € une fois** (29 € early bird) | ✅ inclus, à vie | ✅ tout inclus |
| Paprika 3 | ~37 € (2 × 4,99 $ + 29,99 $) | ❌ derrière l'abonnement en v4 | ❌ chaque plateforme payée séparément |
| Plan to Eat | ~135 € (49 $/an) | ✅ | ✅ mais abonnement perpétuel |
| Mela | ~22 € | ❌ un seul utilisateur | ❌ Apple only |
| Jow | 0 € | ❌ pas le même produit (recettes imposées, pub/affiliation) | — |

- Décomposition au niveau du foyer : 49 € ÷ 4–6 comptes = **~1 €/personne/an dès l'an 2**. Personne ne renonce à une app pour 1 €/personne/an.
- Plan to Eat facture 49 $ **chaque année**. Meal Plan, c'est 49 € **une seule fois** — le même chiffre, sans la récurrence, avec la famille en plus.

**2. L'argument structurel (le plus important pour un solo-dev).** Un achat unique finance un support à vie : plus le prix unitaire est bas, plus il faut de clients pour la même recette — donc plus de support. À 19,99 €, il faudrait **735 clients** pour la recette de 300 clients à 49 € : 2,5× plus d'utilisateurs à supporter, à effort à peu près égal. Prix élevé + moins de clients = structurellement plus sûr pour un indépendant seul.

**3. Le vrai obstacle : l'ancre de prix mobile, pas la valeur.** Le segment ancre les apps mobiles à 2,99–14,99 $ ([Dataintelo](https://dataintelo.com/report/meal-planning-app-market)). La réponse n'est pas de baisser le prix, mais de **cadrer la comparaison sur la page prix** :
- Afficher le tableau TCO ci-dessus directement sur la page tarif (le client fait le calcul lui-même).
- Le **29 € early bird est le vrai prix de lancement** — le lancement se fait majoritairement à ce prix, le 49 € est le prix de croisière.
- Essai complet 30 jours sans carte + garantie 14 jours = le risque perçu tombe, **sans toucher au prix**.

**4. Règle de décision — la bêta tranche, pas toi.** La question est déjà prévue en phase 1 : « 29 € early bird, 49 € ensuite : cher, correct, cadeau ? »

| Verdict majoritaire des bêta-testeurs | Décision |
| --- | --- |
| « correct » ou « cadeau » | Garder 49 € (et le dire : preuve sociale) |
| « cher » | Prix courant à 39 €, ou bascule Option B (9,99 €/an) — mais annoncée, jamais silencieuse |
| « beaucoup trop cher » | Revoir le produit avant le prix : c'est un problème de valeur perçue, pas de tarif |

**Plancher non négociable : 29 €.** En dessous, tu captes des clients à faible engagement qui demandent autant de support, pour une recette divisée — le pire équilibre possible pour un indépendant.

---

## 6. Prérequis produit (avant tout euro encaissé)

Classés par ordre bloquant :

1. **F07 — Import de recettes par URL** (bloquant). La porte d'entrée : personne ne saisit 200 recettes à la main dans une app payante. Test à faire : importer 10 recettes marmiton/750g sans retouche.
2. **Onboarding self-service** (bloquant). Aujourd'hui : comptes créés « en attente de validation » par un ADMIN — incompatible avec une vente en ligne. Inscription instantanée + création du foyer + invitations familiales en 2 minutes.
3. **F12 — PWA hors-ligne** (bloquant). En magasin, sans réseau, la liste de courses doit marcher.
4. **Page marketing + démo vidéo 90 s** (bloquant). Le pitch visuel : drag & drop du planning → liste de courses fusionnée → coché en magasin.
5. **Export/import complet (JSON)** (confiance). Argument anti-cloud closed-source, et sécurité pour toi : données personnelles = RGPD.
6. **Multi-langue FR/EN** (phase 3). Le segment pay-once est majoritairement anglophone ; la roadmap US de Jow montre que le marché FR seul est dominé.

**Ce qui n'est PAS bloquant :** les stats (F13), le garde-manger (F11), les notifications (F10). Le commercial se juge sur : import URL → planning familial → liste de courses. Trois écrans.

---

## 7. Cadre légal et administratif (France, partir de zéro)


| Sujet                        | Ce qu'il faut faire                                                                                                                                                                                                 | Coût               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **Statut**                   | Micro-entreprise (activité : vente de licences logicielles B2C, code APE 5829/6202B), immatriculation en ligne                                                                                                      | 0 €, ~15 min      |
| **TVA**                      | Franchise en base : pas de TVA tant que CA < 36 800 €/an (services), tolérance 41 250 €. Mention sur factures : « TVA non applicable, art. 293 B du CGI »                                                        | 0 €                |
| **Mentions légales**         | Nom, SIREN, adresse, contact sur le site                                                                                                                                                                            | 0 €                |
| **CGV**                      | Obligatoires en B2C : droit de rétractation 14 jours, garantie légale de conformité des contenus numériques, médiation de la consommation. Un modèle de CGV logiciel (~100–200 € avocat/template) suffit au départ | ~0–200 €          |
| **RGPD**                     | Register des traitements, politique de confidentialité, base légale (exécution du contrat), procédure d'export/suppression de compte — ton export JSON fait une partie du travail                                   | 0 € (de ton temps) |
| **Paiement**                 | Stripe + Stripe Tax (calcule la TVA UE si ventes hors France) ; ~1,5 % + 0,25 € par paiement carte UE                                                                                                              | % seulement        |
| **Hors UE (plus tard)**      | Option Merchant of Record (Paddle, Polar…) qui gère TVA/facturation internationale pour 4–8 % — seulement quand le volume le justifie                                                                               | %                  |
| **Facturation électronique** | Se déploie 2026–2027 ; quasi sans impact en B2C à ton échelle, Stripe génère des reçus conformes                                                                                                                    | 0 €                |


Sources : [Service-Public — franchise TVA](https://entreprendre.service-public.gouv.fr/vosdroits/F21746), [impots.gouv — TVA micro-entrepreneur](https://www.impots.gouv.fr/professionnel/questions/je-suis-micro-entrepreneur-ou-la-tete-dune-micro-entreprise-ai-je-des), [Actav — CGV logiciel](https://www.actav.fr/articles/cgv-vente-de-logiciels/), [Beancount — MoR](https://beancount.io/fr/blog/2026/04/23/merchant-of-record-explained-saas-payments-guide).

**Budget administratif total de démarrage : ~150–250 €** (SIRET gratuit, domaine ~12 €/an, template CGV, éventuel MoR plus tard).

---

## 8. Plan de mise en marché — phase par phase

*Principe directeur (leçon documentée des lancements indépendants 2026) : Reddit et les communautés de niche convertissent 3 à 5 fois mieux que Product Hunt ; le pic PH ne dure que ~72 h. On lance donc par paliers croissants : petites plateformes d'abord (feedback + preuve sociale), gros canaux ensuite avec un pitch rodé.*

### Phase 0 — Fondations (semaines 1–4, budget ~50 €)

**Objectif : être prêt à encaisser et observable.**

- [ ] Immatriculation micro-entreprise + nom commercial (vérifier disponibilité .com/.fr).
- [ ] Landing page : promesse 1 phrase, capture d'email (liste d'attente), 3 captures d'écran, aucun jargon technique.
- [ ] Comptes : X/Twitter, compte LinkedIn perso, profil Reddit dédié (ancien ou neuf, il doit avoir de l'histoire avant de poster).
- [ ] En parallèle : développement de F07 + onboarding self-service (c'est la phase la plus longue — les 4 semaines marketing sont légères exprès).
- [ ] Chiffrer les coûts fixes : domaine, e-mailing (Buttondown/Mailchimp gratuit <500 abonnés), hosting.

**KPI de sortie : landing en ligne, 50–100 inscrits en liste d'attente, F07 en beta.**

### Phase 1 — Bêta privée (mois 2–3, budget ~0 €)

**Objectif : 20–40 familles testrices, 5 témoignages utilisables, zéro bug bloquant au paiement.**

- [ ] Recrutement bêta : ta liste d'attente + r/SideProject, r/selfhosted (« early access, je cherche 20 familles testrices ») + entourage réel (l'app est familiale — les familles de ton cercle sont tes premiers utilisateurs honnêtes).
- [ ] Canal support : Discord ou groupe simple — remonte des bugs au fil de l'eau.
- [ ] Collecter systématiquement : témoignages, questions fréquentes (elles deviendront ta FAQ + ton SEO), une métrique « ai-je réimporté mes recettes en < 10 min ? ».
- [ ] Fixer le prix avec les bêta-testeurs (question directe : « 29 € early bird, 49 € ensuite : cher, correct, cadeau ? »).

**KPI de sortie : 20 familles actives, taux d'import URL > 90 % de réussite, 5 témoignages écrits.**

### Phase 2 — Lancement public (mois 4, budget ~0–30 €)

**Objectif : premier flux de trafic qualifié et premières ventes. Le séquencement compte plus que le volume.**

1. **Semaine 1 — petites plateformes** : Uneed, MicroLaunch, BetaList. But : roder le pitch, récolter des commentaires et de la preuve sociale dans un environnement à faible enjeu.
2. **Semaine 2 — Reddit, format storytelling** : r/SideProject, r/selfhosted, r/MealPrepSunday (vérifier les règles de chaque subreddit — ratio d'auto-promo < 10 %, avoir contribué avant de poster). Format gagnant : « J'ai construit un planificateur de repas familial sans abonnement parce que Paprika allait passer les familles au paywall — voilà où j'en suis, chiffres inclus. » L'honnêteté sur tes vrais chiffres convertit mieux que le hype.
3. **Semaine 3 — Hacker News (Show HN) + dev.to** : angle « self-hosted-first, pay-once, RGPD, made in France ».
4. **Semaine 4 — Product Hunt** : seulement maintenant, avec les témoignages de bêta en munition. C'est un jour d'amplification, pas une stratégie — l'objectif est la couverture presse/blogueurs, pas la conversion.

**KPI de sortie : 500–1 500 visiteurs uniques, taux d'inscription à l'essai > 8 %, 10–30 ventes.**

### Phase 3 — Acquisition continue (mois 5–8, budget 0–50 €/mois)

**Objectif : un canal d'acquisition prévisible avant d'ajouter du produit.**

- **SEO comparatif** (le levier n°1 de ce segment) : articles « Meal Plan vs Paprika », « alternative française à Jow pour vos propres recettes », « paprika 4 abonnement : les alternatives pay-once ». Ce sont des requêtes réelles de gens prêts à changer d'outil. 1 article/2 semaines, honnête, avec tableaux.
- **Contenu bouche-à-oreille** : 2 vidéos courtes/mois (planning de la semaine en 60 s) TikTok/YouTube Shorts — la cuisine familiale performe bien en format court.
- **Communautés durables** : répondre régulièrement aux questions planification/courses sur r/MealPrepSunday, forums parents/cuisine. Règle : 10 contributions utiles pour 1 mention du produit.
- **Relations presse micro** : blogs cuisine/organisation familiale FR (ex. blogs parents), newsletters du genre (pitch : « l'anti-abonnement, made in France »).
- **Option payante (M7+ seulement)** : 30–50 €/mois max, uniquement après validation que LTV (49 €) > 3× coût d'acquisition.

**KPI de sortie : 100 ventes cumulées, 1 canal qui apporte > 40 % des inscriptions de façon répétée.**

### Phase 4 — Mobile & international (mois 9+)

- **Packaging mobile (Capacitor)** sur la base web existante : APK Android d'abord (distribution directe ou Play Store), iOS ensuite (compte Apple Developer 99 $/an).
- **Stores en dernier** : commission 15 % (Apple Small Business Program / Google Play 15 % premier M$) + coût des comptes. Le web reste le canal de vente principal (frais ~1,5 %).
- **Localisation EN** : le segment pay-once est massivement anglophone — la traduction double le marché adressable.
- **Ouverture du code ?** Décision à trancher : cœur open source (adoption self-hosted, revenus sur le cloud géré) ou propriétaire (simple, mais ferme une communauté relais). Recommandation : propriétaire au départ, licence « source disponible » à envisager en phase 4.

Sources : [Luka — Product Hunt Is Dead for Indie Hackers](https://luka.to/blog/product-hunt-dead-indie-hackers-first-users-2026), [Uneed — PH alternatives](https://www.uneed.best/blog/uneed-a-product-hunt-alternative), [Apple — Small Business Program](https://developer.apple.com/app-store/small-business-program/), [App fees 2026](https://appdevelopmentcostcalculator.com/app-store-fees/).

---

## 9. Projections de revenus (scénarios honnêtes)


| Scénario   | Ventes/an                       | CA brut    | Après Stripe | Verdict                                                             |
| ---------- | ------------------------------- | ---------- | ------------ | ------------------------------------------------------------------- |
| Pessimiste | 60 ventes à 49 €                | ~2 900 €  | ~2 800 €    | Ça paie le temps de dev si tu y crois sur 3 ans                     |
| Réaliste   | 300 ventes                      | ~14 700 € | ~14 200 €   | Sous les seuils micro-entreprise ; revenu side-project significatif |
| Optimiste  | 1 200 ventes + 200 foyers cloud | ~63 700 € | ~61 500 €   | Approche du seuil TVA services (36 800 €) : anticiper la TVA        |


*Hypothèses : conversion visite→essai 8 %, essai→achat 15–25 % (normes du segment freemium). Aucun scénario n'est une entreprise : c'est le contrat initial du rapport.*

---

## 10. Risques et parades


| Risque                                         | Probabilité | Impact    | Parade                                                                                          |
| ---------------------------------------------- | ----------- | --------- | ----------------------------------------------------------------------------------------------- |
| Paprika 4 gratuit + sans abonnement finalement | Moyenne     | Forte     | Communiquer sur les 3 autres axes (famille incluse, multi-plateforme, données exportables)      |
| Jow ajoute la gestion de recettes perso        | Faible      | Moyenne   | Jow monétise le drive, pas la propriété des données — rester focalisé                           |
| Un clone open source gratuit émerge            | Moyenne     | Moyenne   | Le libre ne fait pas d'onboarding support marketing — la bêta et le SEO sont ta douve           |
| Temps solo-dev (produit + marketing)           | **Forte**   | **Forte** | Le plan est séquencé exprès : ne jamais lancer une phase tant que la précédente n'a pas ses KPI |
| Avis négatif sur un import URL raté            | Moyenne     | Forte     | F07 doit être fiable avant tout marketing : c'est LE moment de vérité du produit                |


---

## 11. Pérennité long terme : le jour où les ventes s'arrêtent

La question qui tue toutes les apps à vie : « si les ventes s'arrêtent, qui paie le serveur ? »

### 11.1 Le serveur n'est pas un problème financier, c'est un problème d'attention

À 10 000 foyers, l'infra coûte ~20 €/mois, soit **0,024 € par foyer et par an**. Une seule vente à 49 € finance ~2 000 ans d'hébergement pour ce foyer ; 200 ventes couvrent 40 ans de VPS. Si les ventes s'arrêtent, le serveur tourne encore des décennies sur les ventes passées. Le vrai risque long terme n'est pas l'argent — c'est **le solo-dev** : son temps (1–2 h/mois), sa motivation, son bus factor.

### 11.2 Les modèles de sync sans serveur (et pourquoi ne pas s'y précipiter)

| Modèle | Principe | Le piège |
| --- | --- | --- |
| **CRDT local-first** (Automerge/Yjs) | Fusion automatique des modifications sans serveur central, convergence mathématique garantie | Les appareils doivent se croiser : le P2P WebRTC exige quand même un serveur de signalisation et un appareil détenteur en ligne. Téléphone au magasin + PC éteint = pas de sync |
| **Sync via le cloud du foyer** (modèle Obsidian/KeePass) | Fichier de données dans l'iCloud Drive/Dropbox du client — zéro infra pour toi | Une PWA web ne surveille pas un dossier cloud fiablement ; conflits à gérer ; **réécriture complète de la couche données** (Drizzle/SQLite serveur-autoritaire → CRDT) |
| **CloudKit (Apple)** | Sync gratuite, zéro serveur, données dans l'iCloud de l'utilisateur, auth incluse | Apple-only : tue le web, tue Android, tue le foyer mixte — le cœur de la proposition |
| **Serveur zéro-maintenance** (Cloudflare Workers + Durable Objects SQLite) | SQLite embarqué dans des objets distribués, disponible sur le plan gratuit (100 000 req/jour, 5 Go) ; plus de VPS à patcher, plus de PM2 | Ce n'est pas « sans serveur », c'est « sans ops » — et better-sqlite3 + Next.js classique ne tournent pas sur Workers : migration réelle, chantier post-lancement |

**Verdict : réécrire la couche données pour économiser 8 €/mois, c'est plusieurs mois de travail contre un coût déjà quasi nul par foyer.**

### 11.3 La vraie parade : dégradation gracieuse + sunset policy publique

La longévité ne s'achète pas en supprimant le serveur — elle se garantit en rendant le serveur **non critique** :

1. **Dégradation gracieuse (déjà en roadmap)** : F12 PWA offline + export JSON complet. Si le serveur meurt, l'app installée continue de fonctionner en local et personne n'est otage de ses données. Le serveur devient une commodité de sync, pas une dépendance vitale.
2. **Sunset policy publique, sur la page prix** : « Si le projet s'arrête, le serveur est open-sourcé pour self-host, et l'export complet est garanti. » Precedents documentés dans le rapport des échecs : RecipeSage survit parce qu'il est open-source ; les utilisateurs de Mealime ont tout perdu. La peur du segment, transformée en **argument commercial**.
3. **Option technique de réserve** : si un jour l'ops de 1–2 h/mois pèse, la migration Cloudflare Durable Objects (SQLite natif, gratuit à cette échelle) est le seul chemin crédible vers un « serveur sans maintenance ».

Sources : [Automerge](https://automerge.org/docs/hello/) · [Stack Overflow — P2P WebRTC et signalisation](https://stackoverflow.com/questions/71047833/web-based-data-synchronization-via-peer-to-peer) · [Dodecaidr — CloudKit offline-first en production](https://dodecaidr.pro/en/articles/cloudkit-offline-sync/) · [Cloudflare — Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)

---

## 12. Prochaines actions — 30 jours

1. **Semaine 1** : immatriculation micro-entreprise ; réserver domaine + nom ; mettre la landing page en ligne avec capture d'emails.
2. **Semaines 1–4** : développement F07 (import URL) — priorité absolue, c'est le seul chantier technique bloquant.
3. **Semaine 2** : ouverture des comptes Reddit/X ; commencer à contribuer (pas encore à vendre) sur r/MealPrepSunday et r/selfhosted.
4. **Semaine 3** : maquette de l'onboarding self-service (inscription → foyer → invitations) pour valider le chantier suivant.
5. **Semaine 4** : point de décision — si F07 est en beta et la landing a 50+ inscrits, planifier la bêta privée (phase 1). Sinon, décaler le marketing et finir F07 : **on ne lance jamais pour rattraper le produit.**

---

## Sources principales

- Marché : [Dataintelo — Meal Planning App Market](https://dataintelo.com/report/meal-planning-app-market) · [Straits Research — Recipe Apps Market](https://straitsresearch.com/report/recipe-apps-market)
- Concurrence : [Useladle — Paprika pricing & alternatives](https://www.useladle.com/blog/paprika-alternative) · [Ultimate Meal Plans — Paprika 4 beta & abonnement](https://ultimatemealplans.com/reviews/paprika) · [Drizzle Lemons — apps sans abonnement](https://www.drizzlelemons.com/blog/recipe-apps-without-subscriptions) · [Recipe One — comparatif](https://www.recipeone.app/blog/best-recipe-manager-apps) · [Wikipédia — Jow](https://fr.wikipedia.org/wiki/Jow.fr) · [Cooklang — Tandoor vs Mealie vs KitchenOwl](https://cooklang.org/blog/42-tandoor-vs-mealie-vs-kitchenowl/)
- Distribution & stores : [Apple — Small Business Program](https://developer.apple.com/app-store/small-business-program/) · [Frais des stores 2026](https://appdevelopmentcostcalculator.com/app-store-fees/)
- Administratif France : [Service-Public — franchise en base TVA](https://entreprendre.service-public.gouv.fr/vosdroits/F21746) · [impots.gouv — obligations TVA micro-entrepreneur](https://www.impots.gouv.fr/professionnel/questions/je-suis-micro-entrepreneur-ou-la-tete-dune-micro-entreprise-ai-je-des) · [Actav — CGV vente de logiciels](https://www.actav.fr/articles/cgv-vente-de-logiciels/)
- Lancement : [Luka — où viennent les premiers utilisateurs en 2026](https://luka.to/blog/product-hunt-dead-indie-hackers-first-users-2026) · [Uneed — stratégies de lancement par paliers](https://www.uneed.best/blog/uneed-a-product-hunt-alternative) · [Beancount — Merchant of Record](https://beancount.io/fr/blog/2026/04/23/merchant-of-record-explained-saas-payments-guide)
