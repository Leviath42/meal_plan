
# Meal Plan — Échecs du segment & fonctionnement de Stripe

*Recherche approfondie — octobre 2026. Complète le rapport « Étude de marché & plan de mise en marché ».*

---

## 1. Question

Que sont devenus les petits produits et projets open source comparables à Meal Plan qui n'ont pas décollé — et comment fonctionne concrètement Stripe pour vendre des licences B2C depuis la France ?

---

## 2. Synthèse

1. **Trois planificateurs de repas majeurs sont morts en deux ans** : Yummly (déc. 2024), PlateJoy (juil. 2025), Mealime (21 oct. 2026). Même schéma à chaque fois : rachat par un grand groupe → la croissance promise n'est pas au rendez-vous → fermeture, données personnelles supprimées. C'est le fait le plus exploitable du rapport : **la portabilité des données est devenue une attente centrale des utilisateurs de ce segment.**
2. **Pepperplate illustre l'échec en sens inverse** : gratuit pendant ~10 ans, puis bascule brutale vers un abonnement payant (2020) → exode des utilisateurs et fiabilité en chute. Mourir en monétisant trop tard et trop mal.
3. **Côté open source, la mortalité est structurelle** : 60 % des mainteneurs ne sont pas payés, 60 % ont arrêté ou envisagé d'arrêter, 44 % citent le burnout. Recipya — acclamé sur r/selfhosted à son lancement — est aujourd'hui en sommeil ; KitchenOwl est vivant mais a frôlé l'effacement quand GitHub a suspendu le compte de son unique mainteneur.
4. **RecipeSage prouve qu'on peut survivre petit** : open source, hébergement financé par des contributions volontaires depuis 2018, surtout grâce à ses **outils d'import depuis les apps concurrentes** — un canal d'acquisition déguisé.
5. **L'économie réelle des petites apps est brutale** : l'app médiane gagne ~72 $/mois un an après son lancement ; les 5 % du haut gagnent 400× plus que les 25 % du bas ; les apps lancées avant 2020 captent 69 % des revenus d'abonnements, celles de 2025+ seulement 3 %.
6. **Stripe est simple et pas cher à ton échelle** : ~1,5 % + 0,25 € par paiement carte européenne, aucun frais fixe, aucune TVA à gérer tant que tu restes sous 36 800 €/an en France et sous 10 000 €/an de ventes transfrontalières UE.

---

## 3. Méthodologie

- **Angles de recherche** : fermetures récentes d'apps de recettes/planning (annonces officielles + réactions utilisateurs), post-mortems d'indépendants, état des dépôts GitHub des projets self-hosted, études statistiques (RevenueCat, sondages mainteneurs OSS), grille tarifaire Stripe France 2026 et régime TVA B2C.
- **Types de sources** : pages de support officielles (PlateJoy), annonces de fermeture (Mealime, Yummly), données sectorielles (RevenueCat), dépôts GitHub (Recipya, KitchenOwl), fiscalité française (l-expert-comptable, impots.gouv).
- **Limites** : plusieurs articles d'analyse proviennent de blogs d'apps concurrentes (FoodiePrep, Pann, Useladle, MealThinker) — utilisés pour les faits (dates, citations) qu'ils documentent, pas pour leurs recommandations commerciales. Les sondages mainteneurs sont cités via des reprises de presse : les chiffres bruts (Tidelift/Sonar) n'ont pas été consultés en primaire. Les tarifs Stripe évoluent (dernier ajustement au 21 octobre 2026) : à re-vérifier avant mise en production.

---

## 4. Constats

### 4.1 Les morts récentes du segment — le fait marquant

| App | Statut | Cause documentée | Ce que les utilisateurs y ont perdu |
|---|---|---|---|
| **Yummly** (15+ ans, racheté ~100 M$ par Whirlpool en 2017) | Fermé le **20 déc. 2024** | Équipe licenciée en avril 2024 (pivot vers l'IA générative) ; service absorbé par les marques électroménager | Aucun export groupé : les collections de recettes sont perdues |
| **PlateJoy** | Fermé le **1ᵉʳ juil. 2025** | Rachat par RVO Health (Healthline) en 2021 « pour ses actifs santé, pas pour faire tourner un produit » ; dev arrêtée, support évaporé | Remboursements au prorata ; recettes versées dans l'app Wellos |
| **Mealime** | Ferme le **21 oct. 2026** | Racheté par Albertsons en 2021 ; catalogue déplacé vers « Meals Hub » dans les apps d'enseignes du groupe | **Toutes les données personnelles supprimées, aucun export** ; abonnés Pro fâchés, pétition des utilisateurs sur Reddit |

Les fils Reddit autour de ces fermetures montrent une communauté qui formule désormais explicitement le critère d'achat : *« avant de s'engager sur la prochaine app, une seule question : comment je récupère mes données »*.

**Traduction pour Meal Plan** : l'export JSON complet prévu dans les prérequis n'est pas qu'une formalité RGPD — c'est un argument marketing de premier plan, directement opposé à Yummly/Mealime. Et les pages « alternatives Mealime / Yummly » qui pullulent aujourd'hui montrent que chaque fermeture génère un flux d'utilisateurs orphelins à capter (SEO : « alternative à Mealime », « récupérer ses recettes Mealime »).

### 4.2 Pepperplate — mourir en monétisant trop tard

Pepperplate, planificateur gratuit depuis ~2010, a annoncé début 2020 la fin du gratuit et un passage à 2,99 $/mois — du jour au lendemain, après une décennie sans monétisation. Réaction des utilisateurs : exode massif (les fils « Pepperplate replacement » datent tous de cette période), puis service devenu incontrôlable, avec des pannes prolongées documentées. La leçon double :

- **La monétisation doit être prévue dès le design du produit** ; la greffer tardivement sur une base habituée au gratuit détruit la confiance et le service en même temps.
- C'est exactement le piège inverse de ta stratégie pay-once dès le premier jour : Meal Plan ne promet jamais gratuit, donc ne trahit jamais.

### 4.3 Les absorbés — la sortie « réussie » qui n'est pas la tienne

Whisk, plateforme de recettes revendiquant un demi-milliard d'impressions mensuelles, a été acquis par Samsung NEXT en 2019 puis renommé Samsung Food en 2023. Le service survit — mais intégré à l'écosystème du géant. C'est le rappel que dans ce segment, les vrais succès indépendants finissent généralement rachetés. Pour un projet familial visé comme revenu side-project, ce n'est pas un échec : c'est la trajectoire que Meal Plan n'a pas besoin de suivre.

### 4.4 Côté open source — la mortalité est structurelle, pas anecdotique

| Projet | Histoire | Statut 2026 |
|---|---|---|
| **Recipya** | Lancé en fanfare sur r/selfhosted (303 votes), prometteur gestionnaire « familial » en Go ; annonce d'une réécriture complète en Rust | Les deux dépôts dorment ; le financement reposait sur GitHub Sponsors et un plan SendGrid gratuit (100 emails/jour). **Cas d'école : produit aimé, zéro modèle économique, sommeil progressif** |
| **KitchenOwl** | Projet actif, multi-mainteneurs, financé par un hébergement payant optionnel | Vivant — mais incident réel : GitHub a suspendu le compte du fondateur (revue automatique), le repo a disparu temporairement, panique de la communauté. **La fragilité du solo-mainteneur est un risque opérationnel, pas théorique** |
| **RecipeSage** | OSS sous AGPL, **hébergement financé par contributions volontaires depuis 2018** ; propose l'import depuis Pepperplate, Paprika, Mela, Crouton, Plan to Eat, etc. | Vivant et durable à petite échelle. **Ses outils de migration depuis les concurrents sont son principal canal d'acquisition** |

Le décor macro : selon les sondages Tidelift 2024 et Sonar 2024 relayés par la presse technique, **60 % des mainteneurs open source ne sont pas payés, 60 % ont arrêté ou envisagé d'arrêter, 44 % citent le burnout** ; le mainteneur bénévole moyen consacre ~8,8 h/semaine. Recipya n'est pas une exception : c'est la trajectoire médiane.

**Traduction pour Meal Plan** : ne lance pas un projet open source « pour la communauté » en comptant sur elle pour vivre. La communauté self-hosted sera une ** Audience (beta-testeurs, relais, SEO), pas un Client. C'est cohérent avec la recommandation du rapport principal : produit propriétaire au départ, offre cloud gérée en option payante.

### 4.5 L'économie réelle des petites apps (données RevenueCat 2025–2026)

L'étude couvre 115 000 apps et plus de 16 Md$ de revenus :

| Indicateur | Valeur |
|---|---|
| Revenu médian d'une app un an après lancement | **~72 $/mois** |
| Revenu mensuel médian (toutes apps, données 2025) | ~92 $/mois ; seules **19 %** atteignent 1 000 $/mois |
| Top 5 % des nouvelles apps après 2 ans vs 25 % du bas | 8 880 $ contre ≤ 19 $ (**écart de 400×**, en hausse) |
| Part des revenus d'abonnement captée par les apps pré-2020 | **69 %** ; les apps lancées en 2025+ : **3 %** |

Lecture froide : lancer une app payante en 2026, c'est rentrer sur un marché où l'essentiel des revenus est déjà capté par les installations existantes. C'est la confirmation chiffrée du positionnement de niche du rapport principal : on ne gagne pas en étant « une app de plus », on gagne en prenant les utilisateurs **mécontents** des apps existantes — orphelins de Mealime/Yummly, dégoutés des abonnements Paprika 4. La rareté des succès rend le plan séquencé et les KPI de sortie encore plus importants : la majorité des échecs ne vient pas du produit mais de l'arrêt du marketing après le lancement.

### 4.6 Ce que ces échecs changent concrètement au plan

1. **Prioriser l'export/import** au même niveau que F07 : l'import d'URL capte les nouveaux, l'import depuis les formats concurrents (Paprika, Mela, Mealie, RecipeSage — tous documentés et importables) capte les **déçus**. C'est le canal d'acquisition le plus rentable du segment (preuve : RecipeSage).
2. **Documenter la portabilité publiquement** : une page « vos données, exportables à tout moment, en un clic » avec capture d'écran — argument direct contre Mealime (données supprimées) et Yummly (aucun export).
3. **Suivre les fermetures comme opportunités SEO** : « alternative à Mealime » et « récupérer ses recettes Yummly » sont des requêtes avec une intention d'achat immédiate et une concurrence encore faible.
4. **Le prix pay-once dès J1 se renforce** : Pepperplate prouve que promettre gratuit puis facturer tue la confiance ; l'anti-abonnement devient un marqueur de confiance durable dans un segment marqué par les caduques.

---

## 5. Annexe — Stripe expliqué pour ton cas

### 5.1 Ce que Stripe est (et n'est pas)

Stripe est une **passerelle de paiement**, pas un marchand : tu restes juridiquement le vendeur (c'est toi qui factures, garanties, gères la TVA). Contrairement à un « Merchant of Record » (Paddle, Polar : 4–8 % de frais, ils deviennent le vendeur légal), Stripe ne prend que le traitement du paiement. À ton échelle française, c'est le bon choix ; le MoR ne devient pertinent que pour vendre massivement hors UE.

### 5.2 Coûts réels (compte français, grille 2026)

| Moyen de paiement | Frais par transaction réussie |
|---|---|
| Carte standard EEE (la quasi-totalité de tes clients FR) | **1,5 % + 0,25 €** |
| Carte premium EEE | 2,8 % + 0,25 € |
| Carte britannique | 2,5 % + 0,25 € |
| Carte internationale | 3,15 % + 0,25 € |
| Prélèvement SEPA | 0,8 % (plafonné à 5 €) |

Pas de frais d'installation ni d'abonnement ; ajustement de grille le 21 oct. 2026 (cartes internationales baissées à 3,15 %, le standard EEE inchangé). Depuis mi-2025, chaque litige (dispute) est facturé, mais le frais est remboursé si tu gagnes.

**Concrètement : une licence à 49 € payée par carte française → ~0,99 € de frais → ~48,01 € nets (98 %). Contre 41,65 € via l'App Store à 15 %.** C'est pour ça que le plan vend web d'abord.

### 5.3 Le flux complet pour une licence Meal Plan

1. **Inscription** : compte Stripe avec ton SIREN de micro-entreprise (vérification KYC : identité, iban, justificatif d'activité). Deux environnements : **mode test** (cartes factices, tout gratuit) puis **mode live**.
2. **Produit** : « Licence Meal Plan — foyer » à 49 € (prix early bird 29 € = coupon ou prix temporaire).
3. **Tunnel de paiement** : soit un simple **Payment Link** (zéro code — Stripe héberge la page, gère 3DS/Strong Customer Authentication, Apple Pay/Google Pay), soit **Stripe Checkout** intégré à ta page de confirmation d'essai.
4. **Webhook** : Stripe appelle ton backend sur `checkout.session.completed` → tu actives le foyer en premium. Deux règles absolues : **vérifier la signature** du webhook et **garantir l'idempotence** (un même paiement ne doit jamais activer deux fois). Stripe renvoie automatiquement en cas d'échec, donc un webhook peut arriver en double.
5. **Après-vente** : reçus automatiques, remboursements en un clic, customer portal, virements vers ton compte bancaire (périodicité réglable).
6. Plus tard seulement : si tu vends une app **standalone avec clé de licence** (pas ton cas serveur), des services comme Keygen ou Keylight font la génération/distribution de clés branchée sur Stripe — inutile tant que c'est un compte premium côté serveur.

### 5.4 TVA : ce que tu dois vraiment faire (spoiler : presque rien au début)

| Situation | Obligation |
|---|---|
| Ventes France, CA < 36 800 €/an (services) | **Rien** : franchise en base TVA. Mention sur facture : « TVA non applicable, art. 293 B du CGI » |
| Ventes B2C à des particuliers d'autres pays UE, cumul < **10 000 €/an** | **Rien** : la règle française continue de s'appliquer (donc la franchise) |
| Ventes B2C UE au-delà de 10 000 €/an | TVA due **au taux du pays de l'acheteur**, déclarée trimestriellement via le **guichet unique OSS** (inscription sur impots.gouv.fr). Stripe Tax peut calculer les montants automatiquement |
| Ventes hors UE | Seulement si le volume le justifie : basculer sur un MoR (Paddle, Polar) qui gère tout pour 4–8 % |

**Traduction en scénarios du rapport principal** : au scénario « réaliste » (~14 700 €/an), tu restes sous tous les seuils — zéro TVA, zéro OSS. Au scénario « optimiste », tu dépasses 10 000 € de ventes UE si l'international démarre : il faudra juste cocher l'inscription OSS, pas de structure à changer.

---

## 6. Notes de sources

| Source | Crédibilité | Dernière mise à jour |
|---|---|---|
| [RevenueCat — State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps) | 4/5 | 2026 (données 2025) |
| [RevenueCat — lancement State of Subscription Apps 2025](https://www.revenuecat.com/blog/company/the-state-of-subscription-apps-2025-launch) | 4/5 | 2025 |
| [PlateJoy Support — annonce officielle de fermeture](https://support.platejoy.com/platejoy-faqs/35663) | 5/5 | 8 mai 2025 |
| [FoodiePrep — Meal planning apps 2026 (fermetures Mealime/PlateJoy/Yummly)](https://www.foodieprep.ai/blog/meal-planning-apps-in-2026-which-tools-actually-simplify-your-kitchen) | 3/5 | 2026 |
| [Pann — Mealime shutting down (21 oct. 2026)](https://www.pann-app.com/blog/is-mealime-shutting-down) | 3/5 | 2026 |
| [Useladle — What happened to Yummly](https://www.useladle.com/blog/yummly-alternative) | 3/5 | 2026 |
| [MealThinker — PlateJoy shut down](https://mealthinker.com/blog/platejoy-alternative) | 3/5 | 2025-2026 |
| [9to5Google — Whisk devient Samsung Food](https://9to5google.com/2023/08/30/whisk-samsung-food-app-rebrand/) | 4/5 | 30 août 2023 |
| [Reddit r/Cooking — fin du gratuit Pepperplate (témoignages utilisateurs)](https://www.reddit.com/r/Cooking/comments/ercs8s/looking_for_pepperplate_app_replacement_any/) | 2/5 | janv. 2020 |
| [Cooklang — Best Recipe Management Software (pannes Pepperplate, fiabilité Copy Me That)](https://cooklang.org/blog/48-best-recipe-management-software/) | 3/5 | 2026 |
| [GitHub — Recipya (dépôt d'origine)](https://github.com/reaper47/recipya) | 4/5 | - |
| [GitHub — Recipya-rs (réécriture en sommeil)](https://github.com/reaper47/recipya-rs) | 4/5 | - |
| [GitHub — KitchenOwl (incident de suspension du compte)](https://github.com/tombursch/kitchenowl/releases) | 4/5 | - |
| [RecipeSage — hosting financé par contributions depuis 2018](https://recipesage.com/alternatives/recipe-keeper/) | 4/5 | - |
| [byteiota — sondages Tidelift/Sonar : 60 % non payés, 60 % départs, 44 % burnout](https://byteiota.com/open-source-maintainer-crisis-60-unpaid-burnout-hits-44/) | 3/5 | 2025-2026 |
| [easy.tools — grille Stripe France vérifiée (1,5 % + 0,25 € carte EEE)](https://www.easy.tools/fr/docs/comprendre-les-frais-stripe) | 3/5 | 27 août 2026 |
| [Realdev — ajustement des tarifs Stripe (21 oct. 2026)](https://www.realdev.fr/stripe-augmente-ses-tarifs-2026/) | 3/5 | 2026 |
| [Inflowpay — Stripe n'est pas un Merchant of Record](https://www.inflowpay.com/fr/blog/la-difference-entre-un-merchant-of-record-et-seller-of-record) | 4/5 | - |
| [l-expert-comptable — seuil OSS 10 000 € B2C intra-UE](https://www.l-expert-comptable.com/a/532222-le-mini-guichet-unique-de-tva.html) | 4/5 | 2026 |
| [Microcitron — TVA OSS en micro-entreprise](https://microcitron.fr/blog/tva-oss-guichet-unique-ventes-ue-micro-entreprise) | 3/5 | - |
| [Keylight — Stripe, webhooks et clés de licence](https://keylight.dev/stripe-license-keys/) | 3/5 | - |
| [Indie Hackers — 38 jours après le relancement, 0 $ (post-mortem solo founder)](https://www.indiehackers.com/post/38-days-after-relaunch-3-people-0-raised-be7a10db55) | 2/5 | - |

**Conflits et réserves** : les articles de FoodiePrep, Pann, Useladle, MealThinker, BeCute sont écrits par des apps concurrentes qui vendent leurs alternatives — les faits qu'ils citent (dates de fermeture, conditions) recoupent toutefois les annonces officielles (page de support PlateJoy, mealime.com). La date de fermeture de Yummly (18 vs 20 déc. 2024) varie d'une source à l'autre selon qu'il s'agit de l'app thermomètre ou du service principal.

---

## 7. Questions ouvertes

- **Mealime après le 21 octobre 2026** : vérifier si Albertsons propose un export tardif sous pression des utilisateurs — s'il n'y en a pas, l'opportunité « orphelins Mealime » reste ouverte plusieurs mois.
- **ChefTap** : plusieurs index de statut signalent des incidents récurrents, sans annonce de fermeture vérifiable. À re-vérifier périodiquement — ce serait le prochain flux d'orphelins.
- **Tarifs Stripe au-delà du standard** : la grille évolue (ajustement du 21 oct. 2026) ; re-vérifier la grille exacte au moment du branchement réel du paiement.
- **Taux de capture réel carte premium vs standard** : la part de cartes « premium » (2,8 %) dans un panier B2C français est mal documentée ; elle n'affecte l'ordre de grandeur que marginalement (~1 €/licence).

---

## 8. Recommandations

1. **Ajouter au backlog, à côté de F07** : import depuis les formats concurrents (Paprika `.paprikarecipes`, Mela, Mealie, RecipeSage) et page publique « export à tout moment ». Ce sont des features d'acquisition, pas de confort.
2. **Préparer dès la phase 1 (bêta) le branchement Stripe en mode test** : Payment Link + webhook + activation du foyer. C'est 1–2 jours de dev, pas un chantier — mais à faire avant le lancement, pas pendant.
3. **Créer une veille « fermetures »** (alerte mensuelle sur « recipe app shut down ») : chaque fermeture = un article SEO + un flux d'utilisateurs orphelins à accueillir.
4. **Ne pas céder à la tentation open source du jour 1** — la trajectoire médiane des projets Recipya & co est documentée dans ce rapport ; l'offre cloud gérée en option est la seule monétisation compatible avec une communauté self-hosted.
5. **Re-viser les projections du rapport principal** à la lumière des chiffres RevenueCat : l'app médiane fait ~72 $/mois ; ne considérer le projet comme validé qu'une fois le cap des ~100 €/mois de revenu récurrent franchi — avant cela, c'est du bruit statistique.
