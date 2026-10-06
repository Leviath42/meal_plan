# Meal Plan 🍳

**Application web familiale de planification des repas et gestion de recettes** - Auto-hébergée sur infrastructure Proxmox.

---

## 🚀 Déploiement et Exécution

### Développement Local

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Accéder à l'application
http://localhost:3000
```

### Production (Docker)

```bash
# Build l'image
docker build -t meal-plan .

# Exécuter le conteneur
docker run -p 3000:3000 -v ./data:/app/data meal-plan
```

---

## 📋 Fonctionnalités

### ✅ **Déjà Implémentées**

#### 🔐 Authentification & Utilisateurs
- Connexion par credentials (email/mot de passe)
- Hash des mots de passe avec Argon2
- Gestion des sessions JWT (30 jours)
- **Rôles** : ADMIN (gestion complète), MEMBER (lecture/écriture), GUEST (attente validation)
- Inscription publique avec validation admin
- Réinitialisation de mot de passe via question secrète
- Page de profil utilisateur avec changement de mot de passe

#### 🍳 Gestion des Recettes
- CRUD complet des recettes
- Association recettes/ingrédients avec quantités
- Tags et catégories
- Temps de préparation et de cuisson

#### 🥕 Gestion des Ingrédients
- CRUD complet des ingrédients
- Organisation par rayons supermarché
- Unités par défaut configurables

#### 🎨 Interface
- Design responsive mobile-first
- Compatibilité Next.js 16
- Glisser-déposer (dnd-kit) pour le calendrier (en développement)
- **Conservation des champs formulaires** en cas d'erreur de validation
- **Menu navigation complet** avec accès au Calendrier
- ✅ **Correction des Server Actions** - Séparation des types et fonctions async pour compatibilité Next.js 16
- ✅ **CRUD complet des repas planifiés** avec drag & drop fonctionnel

---

### ✅ **Récemment Implémenté** (Calendrier MVP)

#### 📅 Calendrier et Planification
- ✅ **CRUD complet des repas planifiés** (Création, Lecture, Mise à jour, Suppression)
- ✅ **Glisser-déposer sur la page d'accueil** : replanification d'un repas entre les jours (et types de repas) + **zone de suppression** apparaissant pendant le drag
- ✅ **Modal d'actions par repas** : Modifier (recette, note, couverts) / Replanifier (date, type) / Supprimer
- ✅ **Plusieurs plats par créneau** : la contrainte d'unicité (1 repas par date + type) a été retirée
- ✅ **Affichage du calendrier** avec 4 types de repas : Petit-déjeuner, Déjeuner, Goûter, Dîner
- ✅ **Navigation par jour** avec boutons Précédent/Suivant/Aujourd'hui
- ✅ **Sélection de recettes** pour chaque créneau
- ✅ **Repas personnalisés** (notes textuelles sans recette)
- ✅ **Gestion des couverts** par repas planifié
- ✅ **Page `/calendar` refondue** : composant partagé `PlannerBoard`, 19 jours (J → J+18) en structure 1-3-3-3-3-3-3, navigation par jour **et par mois**, avec DnD, zone de suppression et modals — identique à la page d'accueil

#### 🔧 Corrections Techniques et UX
- ✅ **Séparation des types Server Actions** - Résolution du problème "use server" exportant des objets
- ✅ **Gestion des timestamps** - Ajout des champs createdAt/updatedAt à meal_plans
- ✅ **Validation TypeScript** - Correction des problèmes de typage avec FormData
- ✅ **Mises à jour partielles** - updateMealPlan accepte les champs partiels (chaine vide = vider un champ)
- ✅ **Fix scroll permanent** - suppression des `min-h-screen` sous la navbar (layout, profil, register)
- ✅ **Pages compactées** - Accueil (cartes côte à côte), Profil (infos sur une ligne, question secrète fusionnée dans l'onglet), Register (formulaire en grille, modal de création d'utilisateur)

---

### 🟚 **En Développement** (Branche: `feat--Implémentation-calendrier`)

#### 📋 Liste de Courses
- [ ] Agrégation automatique des ingrédients planifiés
- [ ] Fusion des doublons et sommation des quantités
- [ ] Cases à cocher pour suivi des achats
- [ ] Export en texte brut et PDF

#### 🔗 Partage
- [ ] Export ICS pour intégration Google Calendar/Home Assistant
- [ ] Page publique accessible par jeton d'accès
- [ ] API REST pour intégration Home Assistant

---

### 📅 **Fonctionnalités Prévues** (Voir [ROADMAPV2.md](ROADMAPV2.md))

| Fonctionnalité | Priorité | Statut |
|---------------|----------|--------|
| Calendrier + Glisser-déposer | 🔴 Haute | 🟡 En développement |
| Génération liste de courses | 🟡 Moyenne | ⏳ Planifiée |
| Export ICS / Page publique | 🟡 Moyenne | ⏳ Planifiée |
| Proposition de repas | 🟡 Moyenne | ⏳ Planifiée |
| Historique des repas | 🟢 Basse | ⏳ Planifiée |
| Antidoublon | 🟢 Basse | ⏳ Planifiée |
| Import de recettes depuis URL | 🟢 Basse | ⏳ Planifiée |
| Notifications du repas du jour | 🟢 Basse | ⏳ Planifiée |
| Gestion du garde-manger | 🟢 Basse | ⏳ Planifiée |
| Mode hors-ligne (PWA) | 🟢 Basse | ⏳ Planifiée |
| OAuth (Google/GitHub) | 🟢 Basse | ⏳ En attente env vars |

---

## 🛠 Stack Technique

| Couche | Technologie | Version | Documentation |
|-------|-------------|---------|---------------|
| **Framework** | Next.js | 16.x | [nextjs.org](https://nextjs.org) |
| **Langage** | TypeScript | - | [typescriptlang.org](https://typescriptlang.org) |
| **UI** | Tailwind CSS | - | [tailwindcss.com](https://tailwindcss.com) |
| **Components** | shadcn/ui | - | [ui.shadcn.com](https://ui.shadcn.com) |
| **Drag & Drop** | @dnd-kit | - | [dndkit.com](https://dndkit.com) |
| **ORM** | Drizzle ORM | - | [orm.drizzle.team](https://orm.drizzle.team) |
| **Base de données** | SQLite | better-sqlite3 | [github.com/WiseLibs/better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| **Authentification** | NextAuth | v5 | [next-auth.js.org](https://next-auth.js.org) |
| **Validation** | Zod | - | [zod.dev](https://zod.dev) |
| **Container** | Docker | - | [docker.com](https://docker.com) |

---

## 🗂️ Architecture du Projet

```
meal_plan/
├── app/
│   ├── actions/                    # Server Actions
│   │   ├── auth.ts               # Authentification
│   │   ├── ingredients.ts        # Gestion ingrédients
│   │   ├── recipes.ts            # Gestion recettes
│   │   └── meal-plan.ts          # Planification (à créer)
│   │
│   ├── api/                      # Endpoints API
│   │   └── auth/                # Auth NextAuth v5
│   │
│   ├── calendar/                 # Calendrier (en développement)
│   │   ├── page.tsx
│   │   ├── CalendarClient.tsx
│   │   ├── CalendarWeekView.tsx
│   │   └── CalendarDayView.tsx
│   │
│   ├── ingredients/              # Gestion ingrédients
│   │   ├── IngredientRow.tsx
│   │   ├── NewIngredientForm.tsx
│   │   └── page.tsx
│   │
│   ├── login/                   # Connexion
│   │   └── page.tsx
│   │
│   ├── profile/                 # Profil utilisateur
│   │   ├── ProfileClient.tsx
│   │   └── page.tsx
│   │
│   ├── recipes/                 # Gestion recettes
│   │   ├── [id]/
│   │   │   ├── edit/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   │
│   ├── register/                # Inscription & Admin
│   │   ├── RegisterClient.tsx
│   │   └── page.tsx
│   │
│   ├── reset-password/          # Réinitialisation MDP
│   │   ├── ResetPasswordClient.tsx
│   │   └── page.tsx
│   │
│   ├── shopping-list/           # Liste de courses (à créer)
│   │   ├── ShoppingListClient.tsx
│   │   └── page.tsx
│   │
│   ├── layout.tsx               # Layout principal
│   └── page.tsx                 # Page d'accueil
│
├── lib/
│   ├── auth.ts                 # Configuration NextAuth
│   └── db/
│       ├── index.ts            # Connexion DB
│       ├── schema.ts           # Schéma de la base
│       └── migrations/         # Migrations Drizzle
│
├── public/                     # Assets statiques
│   └── manifest.json           # Manifest PWA (à compléter)
│
├── data/                       # Données persistantes
│   └── sqlite.db               # Base de données SQLite
│
├── proxy.ts                    # Middleware proxy
├── package.json
├── README.md
├── ROADMAP.md                  # Roadmap originale
├── ROADMAPV2.md                # Planification complète
├── meal_plan_requirements.md    # Cahier des charges
└── drizzle.config.ts           # Configuration Drizzle
```

---

## 🔐 Identifiants de Test

| Rôle | Email | Mot de passe | Statut |
|------|-------|--------------|--------|
| **Admin** | `admin@mealplan.local` | `admin123` | ✅ Fonctionnel |

**Pour tester** :
1. Connectez-vous avec l'admin
2. Créez un utilisateur GUEST via `/register`
3. Validez le GUEST via l'interface admin
4. Le nouvel utilisateur (MEMBER) peut se connecter

---

## 📄 Documentation

- **[ROADMAPV2.md](ROADMAPV2.md)** - Planification complète du projet et feuille de route détaillée
- **[ROADMAP.md](ROADMAP.md)** - Revue technique et état actuel
- **[meal_plan_requirements.md](meal_plan_requirements.md)** - Cahier des charges complet

---

## 🌱 Seed de la Base de Données

Le projet inclut un script de seed pour pré-remplir la base de données avec des recettes et ingrédients de démonstration.

```bash
# Exécuter le seed pour peupler la base avec ~45 recettes et ~108 ingrédients
npm run seed

# Vider la base avant un nouveau seed
npm run seed -- --clear
```

**Contenu du seed :**
- 45 recettes variées (pâtes, viandes, poissons, desserts, légumes)
- 108 ingrédients classés par rayons
- 258 associations recettes-ingrédients
- Inclut la recette "Jambon Pâtes" et tous les classiques familiaux
- **Champ `mealCourse`** intégré pour toutes les recettes (entrée, plat, accompagnement, dessert, boisson, apéritif)

⚠️ **Note :** Le fichier `lib/db/seed.ts` contient toutes les données de démonstration. Pensez à le maintenir à jour lorsque vous ajoutez de nouvelles fonctionnalités nécessitant des données de test.

---

## 🎯 Prochaines Étapes

### **Priorité Immédiate**
1. **Génération de la liste de courses** (F05)
   - Agrégation des ingrédients du planning
   - Fusion des doublons et sommation des quantités
   - Export en texte brut

2. **Partage du planning** (F04)
   - Export ICS
   - Page publique avec jeton d'accès
   - Intégration Home Assistant (préparation)

### **Objectif Court Terme**
Atteindre le **MVP** : Planification des repas (CRUD + dnd) + Liste de courses + Partage basique

### **Objectif Long Terme**
Implémenter **100% du cahier des charges** (voir [ROADMAPV2.md](ROADMAPV2.md))

---

## 🤝 Contribution

### Branches
- `main` - Version stable (tag: `last-stable`)
- `feature/calendrier` - Développement du calendrier (en cours)

### Processus
1. **Créer une branche** depuis `main` :
   ```bash
   git checkout -b feature/nom-feature
   ```
2. **Commiter les changements** :
   ```bash
   git commit -m 'feat: description de la fonctionnalité'
   ```
3. **Pousser vers GitHub** :
   ```bash
   git push origin feature/nom-feature
   ```
4. **Ouvrir une Pull Request** vers `main`

### Bonnes Pratiques
- Un commit par fonctionnalité atomique
- Messages de commit clairs et descriptifs
- Tests avant chaque push
- Documentation mise à jour

---

## 📞 Support et Dépannage

### Problèmes Courants

| Problème | Solution |
|----------|----------|
| Base de données en lecture seule | Vérifier les permissions du fichier `data/sqlite.db` |
| Erreur de connexion | Vérifier que le rôle n'est pas GUEST |
| Drag & drop ne fonctionne pas | Vérifier l'intégration de dnd-kit |

### Vérifications
1. **Logs du serveur** : `npm run dev`
2. **Base de données** : `data/sqlite.db`
3. **Variables d'environnement** : `.env.local`

---

## 🏆 Objectifs du Projet

- ✅ **Authentification complète**
- ✅ **Gestion utilisateurs**
- ✅ **Gestion recettes et ingrédients** (avec mealCourse)
- ✅ **Conservation des champs formulaires en cas d'erreur**
- ✅ **Menu navigation complet avec lien Calendrier**
- ✅ **Seed de données complet** (45 recettes, 108 ingrédients)
- 🟡 **Calendrier et planification** (CRUD + dnd-kit - en développement)
- ⏳ **Liste de courses automatique**
- ⏳ **Partage et intégrations**
- ⏳ **Fonctionnalités avancées** (PWA, notifications, etc.)

---

*Application développée avec ❤️ pour simplifier la planification des repas familiaux.*
*Projet auto-hébergé sur infrastructure Proxmox avec accès multi-supports.*
