# Cahier des charges — Application de planification des repas

**Projet :** Application web familiale de planification des repas, auto-hébergée.

**Statut :** **v1.4** — v1.3 (périmètre, solutions techniques, architecture d'accès réseau) + addendum multi-tenant & administration (vision SaaS, non engagé).

## 1. Présentation du projet

### 1.1 Contexte

Application destinée à un usage familial, déployée sur l'infrastructure domestique existante :

- **Serveur virtuel Proxmox** (hôte des services Docker / LXC)
    
- **Accès multi-supports :** Tablette (Android), smartphones (PWA iOS/Android) et PC (local et distant).
    

### 1.2 Objectifs

Planifier les repas de la famille sur un calendrier, gérer un livre de recettes local, générer automatiquement les listes de courses et partager le planning, sans coût d'abonnement. L'accès doit être fluide à la maison comme à l'extérieur (ex. consultation de la liste de courses en supermarché).

### 1.3 Cibles utilisateurs

|**Rôle**|**Droits**|
|---|---|
|**Admin**|Lecture + écriture + gestion des comptes et jetons API|
|**Membre**|Lecture + écriture (recettes, planning, liste de courses)|
|**Invité**|Pas d'accès, attente validation admin

## 2. Fonctionnalités

### 2.1 Fonctionnalités principales

|**Réf**|**Fonctionnalité**|**Description**|**Priorité**|
|**F01**|**Planification des repas**|Calendrier hebdomadaire/mensuel (petit-déj, déjeuner, dîner), glisser-déposer d'une recette vers un créneau, déplacement/suppression.|Haute (MVP)|
|**F02**|**Gestion des recettes**|Créer, modifier, supprimer, dupliquer ; titre, photo, ingrédients, étapes, temps de préparation, tags, nombre de portions.|Haute (MVP)|
|**F03**|**Proposition de repas**|Suggestion aléatoire ou filtrée par mots-clés/tags (ex. « végé », « rapide », « hiver »), bouton « propose-moi un menu » pour un créneau vide.|Moyenne|
|**F04**|**Partage du planning**|Export ICS consultable dans Google Calendar / Home Assistant / FamilyWall ; page publique à jeton (mode kiosque tablette murale).|Moyenne|
|**F05**|**Liste des ingrédients**|Agrégation automatique des ingrédients du planning (semaine/mois ou dates précises), fusion des doublons, sommation des quantités, cases à cocher, masquage des achetés, ajout manuel avec recherche catalogue, purge validée, export texte.|Moyenne|
|**F06**|**Authentification & autorisations**|Comptes utilisateur, rôles lecture/écriture, sessions sécurisées (httpOnly cookies, jetons d'accès).|Haute (MVP)|

### 2.2 Fonctionnalités secondaires (backlog)

- **F07 :** Import d'une recette depuis une URL (scraping HTML / microdonnées Schema.org)
    
- **F08 :** Historique (« quand avons-nous mangé ce plat ? »)
    
- **F09 :** Antidoublon (« pas de repas en double sur X jours »)
    
- **F10 :** Notifications du repas du jour
    
- **F11 :** Gestion d'un garde-manger / stock basique
    
- **F12 :** Mode hors-ligne partiel (PWA Service Worker)
- **F13 :** Statistiques d'usage (fréquence des recettes, plats les plus cuisinés, répartition par type de plat, taux d'utilisation du catalogue)
- **F14 (backlog) :** Thèmes et palettes de couleurs sélectionnables dans les paramètres (palettes clair + sombre)
    

## 3. Solutions techniques retenues

### 3.1 PWA (Progressive Web App) & Accessibilité distante

- **PWA installable :** Manifeste web (`manifest.json`), icônes et Service Worker pour installation directe sur écran d'accueil (iOS Safari, Android Chrome, Windows/Mac).
    
- **Usage extérieur :** Accès de la liste de courses en supermarché via smartphone grâce à la publication sur Internet sécurisée.
    

### 3.2 Stack technique

|**Couche**|**Choix retenu**|**Justification**|
|---|---|---|
|**Langage**|**TypeScript** (bout en bout)|Typage partagé client/serveur, sécurité du code|
|**Framework**|**Next.js 15** (App Router)|Full-stack unifié, Server Actions, support PWA|
|**Styling**|**Tailwind CSS + shadcn/ui**|Composants UI accessibles, légers et responsive|
|**Calendrier**|**dnd-kit** + composants sur-mesure|Glisser-déposer fluide et compatible tactiles|
|**Base de données**|**SQLite** (`better-sqlite3`)|Performance, zéro dépendance réseau, backup par simple copie|
|**ORM**|**Drizzle ORM**|Léger, typé, migrations simples|
|**Auth**|**Auth.js** (NextAuth v5) + Argon2id|Sessions `httpOnly`, gestion fine des rôles et jetons|
|**ICS / API**|Génération `ics` native / endpoints API|Partage universel de flux|
|**Packaging**|**Docker** (multi-stage build standalone)|Conteneurisation isolée sur Proxmox LXC|

### 3.3 Architecture d'accès réseau & Déploiement

#### **Accès Internet via Reverse Proxy Dédié (Cloudflare Tunnel)**

- **Avantages :** Nom de domaine propre (`repas.******.fr`), pas d'ouverture de ports de box (si Cloudflare Tunnel), protection WAF / TLS automatique, accès direct très rapide pour la PWA.
    

### 3.4 Schéma de données

A construire

### 3.5 Points d'intégration

1. **Home Assistant :**
    
Solution à définir
        
2. **Calendriers externes :**
    
Solution à définir

        

### 3.6 Contraintes & Sécurité de l'exposition Internet

- **Authentification renforcée :** Mots de passe hachés en Argon2id, cookies de session `httpOnly`, `Secure`, `SameSite=Lax`.
    
- **Protections Web :** Rate-limiting sur les tentatives de connexion (`express-rate-limit` / middleware Next.js) et validation stricte des entrées utilisateurs via Zod.
    
- **Sécurité des jetons externes :** Les accès ICS et API HA utilisent des jetons cryptographiques révocables isolés du compte utilisateur principal.
    
- **Headers HTTP Sécurisés :** En-têtes HSTS, X-Frame-Options (autorisé uniquement pour Ingress HA si configuré) et Content-Security-Policy (CSP).

## 4. Critères d'acceptation

1. La PWA s'installe depuis le navigateur en réseau local et depuis Internet via le domaine sécurisé (`[https://repas.********.fr](https://repas.********.fr)` ou via HA).
    
2. Un membre peut gérer les recettes, téléverser des photos et organiser le calendrier depuis un smartphone à l'extérieur (ex. en 4G/5G).
    
3. La liste de courses est accessible hors du domicile et permet de cocher les ingrédients au supermarché.
    
4. L'accès kiosque sur tablette murale et les flux ICS fonctionnent sans session interactive grâce à des jetons révocables.
    
5. Les API REST sont consommées proprement par Home Assistant pour les automatisations locales.
    
6. La base SQLite et le dossier d'images sont conservés sur un volume hôte Proxmox et sauvegardés automatiquement.

## 5. Addendum v1.4 — Multi-tenant & administration (vision SaaS)

**Statut :** addendum de **vision, non engagé**. Il prépare l'hypothèse de commercialisation SaaS (plusieurs foyers hébergés) sans modifier le périmètre actuel mono-foyer. À mettre en œuvre uniquement si la commercialisation passe du stade « opportunité secondaire » au stade actif (voir `docs/plan-commercialisation.md`).

### 5.1 Principe directeur

L'application est conçue aujourd'hui pour **un seul foyer**. L'hébergement mutualisé suppose d'isoler strictement plusieurs foyers (tenants) sur une même instance.

**Le foyer est l'unité d'isolation** : recettes, plannings, photos, jetons et membres n'appartiennent qu'à un seul foyer. Aucune donnée n'est partagée entre foyers.

### 5.2 Modèle de tenancy

| Option | Principe | Avantages | Inconvénients |
|---|---|---|---|
| **A — Une base SQLite par foyer** (recommandée) | Dossier `data/<foyer-id>/` : base + photos | Isolation physique maximale ; backup/restauration/export par copie de dossier ; suppression RGPD triviale ; schéma inchangé | Connexion par foyer (pool) ; métriques cross-foyers à agréger à part |
| **B — Base unique + colonne `tenant_id`** | Toutes les tables portent `tenant_id` | Une seule connexion ; stats plateforme simples | Fuite inter-foyers possible à chaque requête (le filtre doit être inaliénable, au niveau ORM) ; export/suppression par foyer complexes |

**Recommandation : option A**, cohérente avec l'argument actuel de SQLite (« backup par simple copie »). Si l'app évolue vers PostgreSQL (v1+), l'option B devient plus naturelle : la décision finale est donc **explicitement reportée au moment de la mise en œuvre**.

### 5.3 Rôles et droits d'accès

| Rôle | Portée | Droits |
|---|---|---|
| **Super-admin plateforme** | Instance | Gestion des foyers (création, suspension, suppression), souscriptions, quotas, métriques techniques. **Aucun accès au contenu** (recettes, plannings) |
| **Admin foyer** | Son foyer | Droits actuels de l'admin : comptes du foyer, jetons ICS/API |
| **Membre** | Son foyer | Lecture + écriture (inchangé, F06) |
| **Invité** | Son foyer | Attente validation admin (inchangé) |

- Un compte appartient à **un seul foyer** dans le premier lot multi-tenant ; l'appartenance multiple est explicitement hors périmètre.
- Toute route API vérifie « foyer du jeton de session == foyer de la ressource ».
- Les jetons ICS et API Home Assistant restent **scopés au foyer** (F04, §3.6).

### 5.4 Administration plateforme

- Console `/admin` réservée au super-admin : liste des foyers, état de souscription, volumétrie (recettes, photos, taille de base), actions suspendre / réactiver / supprimer.
- **Quotas par foyer** (photos, recettes) : à définir au moment du lancement SaaS, pas avant.
- **Suppression d'un foyer** : effacement du dossier `data/<foyer-id>/` — avantage décisif de l'option A pour le droit à l'effacement RGPD.
- **Facturation** : le multi-tenant est le prérequis technique du paiement en ligne (voir `docs/echecs-et-stripe.md`) mais cet addendum n'anticipe aucune implémentation Stripe.

### 5.5 Impact sur l'existant

- **F06 (auth)** : le middleware résout le foyer courant en plus de la session ; aucune reprise des rôles existants.
- **F04 (ICS) / intégration HA** : jetons déjà révocables, à scop er par foyer — pas de refonte.
- **Sauvegardes (critère 6)** : le script itère par dossier de foyer.
- **Kiosque tablette murale** : un jeton ne donne accès qu'au planning de son foyer.

### 5.6 Critères d'acceptation (à n'activer qu'au passage SaaS)

1. Deux foyers sur la même instance ne peuvent voir aucune donnée l'un de l'autre (test croisé automatisé).
2. Un super-admin peut suspendre, réactiver et supprimer définitivement un foyer (suppression vérifiable sur le disque).
3. Les jetons ICS/API d'un foyer ne fonctionnent pas pour un autre foyer.
4. Le backup/restauration fonctionne foyer par foyer.
