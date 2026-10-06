# Meal Plan - ROADMAP V2 - Planification Complète du Cahier des Charges

*Dernière mise à jour : 2026-10-06*
*Version : 2.0*
*Basé sur : [meal_plan_requirements.md](meal_plan_requirements.md)*

---

## 📋 **Résumé du Projet**

Application web **familiale** de planification des repas et gestion de recettes.

**Objectif principal** : Planifier les repas de la famille sur un calendrier, gérer un livre de recettes local, générer automatiquement les listes de courses et partager le planning, sans coût d'abonnement.

**Accès** : Fluide à la maison comme à l'extérieur (ex. consultation de la liste de courses en supermarché).

---

## 🎯 **Rôles et Permissions**

| Rôle | Accès | Description |
|------|-------|-------------|
| **ADMIN** | Lecture + Écriture + Gestion | Peut gérer les comptes, les recettes, le planning, et les jetons API |
| **MEMBER** | Lecture + Écriture | Peut gérer les recettes, le planning, et la liste de courses |
| **GUEST** | Aucun | Compte en attente de validation par un ADMIN |

---

## 📊 **État Actuel du Projet**

### ✅ **Fonctionnalités Déjà Implémentées (100%)**

| ID | Fonctionnalité | Statut | Détails |
|----|----------------|--------|---------|
| **F06** | **Authentification & Autorisations** | ✅ **COMPLET** | NextAuth v5, Argon2, sessions JWT, rôles GUEST/MEMBER/ADMIN, bloquage connexion GUEST |
| **F02** | **Gestion des Recettes** | ✅ **COMPLET** | CRUD complet, association recettes/ingrédients, quantités, unités |
| **F02** | **Gestion des Ingrédients** | ✅ **COMPLET** | CRUD complet, catégories (rayons), unités par défaut |
| - | **Réinitialisation mot de passe** | ✅ **COMPLET** | Flux complet avec question secrète, vérification 2 étapes |
| - | **Page Profil** | ✅ **COMPLET** | Affichage infos, changement mot de passe, déconnexion automatique |
| - | **Interface Admin** | ✅ **COMPLET** | Liste utilisateurs, validation GUEST→MEMBER, promotion/démotion, suppression |
| - | **Design Responsive** | ✅ **COMPLET** | Mobile-first, Next.js 16 compatible, conteneurs cohérents |

### 📌 **Stack Technique Actuelle**

| Couche | Technologie | Version | Statut |
|-------|-------------|---------|--------|
| Framework | Next.js | 16 | ✅ Configurée |
| UI | Tailwind CSS | - | ✅ Implémentée |
| ORM | Drizzle ORM | - | ✅ Fonctionnel |
| Base de données | SQLite | better-sqlite3 | ✅ Configurée |
| Authentification | NextAuth | v5 | ✅ Fonctionnelle |
| Hashage | Argon2 | - | ✅ Intégrée |
| Validation | Zod | - | ✅ Utilisée |

---

## 🚀 **Fonctionnalités à Implémenter (Par Priorité)**

### 🔴 **PHASE 1 - MVP Complet (Priorité HAUTE)**
*Objectif : Rendre l'application fonctionnelle pour la planification de base*

#### **F01 - Planification des Repas** *(MVP - Haute Priorité)*
- [ ] **Calendrier hebdomadaire/mensuel**
  - [ ] Affichage calendrier (semaine/mois) avec navigation
  - [ ] 3 types de repas : Petit-déjeuner, Déjeuner, Dîner
  - [ ] Affichage des repas planifiés par jour
- [ ] **Glisser-déposer des recettes**
  - [ ] Intégration de `dnd-kit` pour le drag & drop
  - [ ] Ajout d'une recette à un créneau (jour + type de repas)
  - [ ] Déplacement d'un repas existant vers un autre créneau
  - [ ] Suppression d'un repas du calendrier
- [ ] **Navigation calendrier**
  - [ ] Boutons Précédent/Suivant (semaine/mois)
  - [ ] Sélecteur de date direct
- [ ] **Affichage des détails**
  - [ ] Voir les informations de la recette directement dans le calendrier
  - [ ] Lien vers la fiche complète de la recette

**Fichiers à créer/modifier** :
- `app/calendar/page.tsx` (page principale)
- `app/calendar/CalendarClient.tsx` (composant client avec dnd-kit)
- `app/calendar/CalendarWeekView.tsx` (vue hebdomadaire)
- `app/calendar/CalendarDayView.tsx` (vue quotidienne)
- `app/actions/meal-plan.ts` (Server Actions pour la gestion du planning)
- `lib/db/schema.ts` (ajout table `meal_plans`)
- Migration Drizzle pour la table `meal_plans`

**Estimation** : 3-5 jours

---

### 🟡 **PHASE 2 - Fonctionnalités de Base (Priorité MOYENNE)**
*Objectif : Ajouter les fonctionnalités essentielles pour une utilisation quotidienne*

#### **F05 - Génération de Liste de Courses** *(Moyenne Priorité)*
- [ ] **Agrégation automatique des ingrédients**
  - [ ] Sélection d'une période (jour/semaine/mois)
  - [ ] Extraction des ingrédients de toutes les recettes planifiées
  - [ ] Fusion des doublons (même ingrédient)
  - [ ] Sommation des quantités
- [ ] **Interface de la liste**
  - [ ] Affichage par rayons (catégories)
  - [ ] Cases à cocher pour les articles achetés
  - [ ] Tri par rayon/ordre alphabétique
- [ ] **Export de la liste**
  - [ ] Export en texte brut
  - [ ] Export PDF (optionnel)
  - [ ] Partage par lien (optionnel)

**Fichiers à créer/modifier** :
- `app/shopping-list/page.tsx`
- `app/shopping-list/ShoppingListClient.tsx`
- `app/actions/shopping.ts`
- Amélioration de l'interface existante des ingrédients

**Estimation** : 2-3 jours

---

#### **F04 - Partage du Planning** *(Moyenne Priorité)*
- [ ] **Export ICS**
  - [ ] Génération d'un fichier .ics à partir du calendrier
  - [ ] Intégration des métadonnées (titre, description, date)
  - [ ] Téléchargement direct du fichier
  - [ ] Lien de téléchargement partagé
- [ ] **Page publique avec jeton**
  - [ ] Génération de jetons d'accès (cryptographiques, révocables)
  - [ ] Route `/public/calendar?token=...` accessible sans authentification
  - [ ] Affichage en mode lecture seule
  - [ ] Expiration des jetons (7 jours par défaut)
- [ ] **Intégration Home Assistant** (Préparation)
  - [ ] Endpoint API pour récupérer le planning au format JSON
  - [ ] Documentation pour l'intégration HA

**Fichiers à créer/modifier** :
- `app/api/calendar/ics/route.ts` (export ICS)
- `app/api/calendar/public/route.ts` (accès public avec jeton)
- `app/public/calendar/page.tsx` (page publique)
- `app/actions/tokens.ts` (gestion des jetons)
- `lib/db/schema.ts` (table `access_tokens`)

**Estimation** : 3-4 jours

---

### 🟢 **PHASE 3 - Améliorations Utilisateur (Priorité MOYENNE-BASSE)**

#### **F03 - Proposition de Repas** *(Moyenne Priorité)*
- [ ] **Suggestions aléatoires**
  - [ ] Bouton "Propose-moi un menu" sur un créneau vide
  - [ ] Sélection aléatoire parmi toutes les recettes
  - [ ] Option de filtre par tags (végé, rapide, hiver, etc.)
- [ ] **Suggestions intelligentes**
  - [ ] Éviter les doublons sur X jours (F09)
  - [ ] Tenir compte de l'historique (F08)
  - [ ] Préférences utilisateur (optionnel)

**Fichiers à créer/modifier** :
- `app/actions/suggestions.ts`
- Intégration dans le calendrier

**Estimation** : 1-2 jours

---

#### **F08 - Historique des Repas** *(Basse Priorité)*
- [ ] **Suivi des repas consommés**
  - [ ] Date du dernier repas pour chaque recette
  - [ ] Fréquence d'apparition
  - [ ] Statistiques (optionnel)
- [ ] **Affichage dans le calendrier**
  - [ ] Icône/indicateur pour les repas déjà servis récemment

**Fichiers à modifier** :
- `lib/db/schema.ts` (ajout champ `lastServedAt` sur les recettes)
- `app/actions/recipes.ts` (mise à jour à chaque planification)
- Migration Drizzle

**Estimation** : 1 jour

---

#### **F09 - Antidoublon** *(Basse Priorité)*
- [ ] **Configuration utilisateur**
  - [ ] Paramètre : "Ne pas répéter un repas sur X jours"
  - [ ] Valeur par défaut : 7 jours
- [ ] **Vérification automatique**
  - [ ] Empêcher l'ajout d'une recette déjà planifiée dans la période
  - [ ] Avertissement visuel si tentative

**Fichiers à modifier** :
- `app/actions/meal-plan.ts` (vérification avant ajout)
- `lib/db/schema.ts` (ajout champ `minDaysBetween` sur les utilisateurs)

**Estimation** : 1 jour

---

### 🔵 **PHASE 4 - Fonctionnalités Avancées (Priorité BASSE)**

#### **F07 - Import de Recettes depuis URL** *(Basse Priorité)*
- [ ] **Scraping HTML**
  - [ ] Extraction des métadonnées Schema.org (Recipe)
  - [ ] Parse des sites populaires (Marmiton, 750g, etc.)
  - [ ] Prévisualisation avant import
- [ ] **Gestion des erreurs**
  - [ ] Message clair si le site n'est pas supporté
  - [ ] Import manuel possible

**Fichiers à créer** :
- `app/actions/import-recipe.ts`
- `app/recipes/import/ImportRecipeForm.tsx`

**Estimation** : 2-3 jours

---

#### **F10 - Notifications du Repas du Jour** *(Basse Priorité)*
- [ ] **Notifications Push** (PWA)
  - [ ] Notification quotidienne à heure configurable
  - [ ] Rappel : "Aujourd'hui : [Nom du repas]"
- [ ] **Email** (optionnel, si SMTP configuré)
  - [ ] Envoi quotidien avec les recettes du jour

**Fichiers à créer** :
- Service Worker pour les notifications
- `app/api/notifications/route.ts` (optionnel)

**Estimation** : 2 jours

---

#### **F11 - Gestion du Garde-Manger** *(Basse Priorité)*
- [ ] **Stock des ingrédients**
  - [ ] Quantité disponible par ingrédient
  - [ ] Date de péremption (optionnel)
- [ ] **Intégration avec la liste de courses**
  - [ ] Exclusion des ingrédients déjà en stock
  - [ ] Suggestions d'achat basées sur le stock

**Fichiers à créer** :
- `lib/db/schema.ts` (table `pantry_items`)
- `app/pantry/page.tsx`
- Migration Drizzle

**Estimation** : 2-3 jours

---

#### **F12 - Mode Hors-Ligne Partiel (PWA)** *(Basse Priorité)*
- [ ] **Service Worker**
  - [ ] Cache des recettes et ingrédients
  - [ ] Consultation du calendrier hors ligne
  - [ ] Synchronisation automatique au retour en ligne
- [ ] **Manifest PWA**
  - [ ] Configuration complète pour installation
  - [ ] Icônes et thème

**Fichiers à créer/modifier** :
- `public/manifest.json`
- `app/sw.ts` (Service Worker)
- Configuration Next.js pour PWA

**Estimation** : 2-3 jours

---

#### **OAuth (Google, GitHub)** *(Basse Priorité - Attente env vars)*
- [ ] Configuration des providers OAuth
- [ ] Boutons de connexion alternatifs
- [ ] Gestion des comptes liés

**Estimation** : 1 jour

---

## 📅 **Planification par Itération**

### **Itération 1 - MVP Calendrier (2-3 semaines)**
**Objectif** : Livrer la fonctionnalité principale de planification

- [ ] **F01 - Planification des repas** (3-5 jours)
  - Calendrier + Glisser-déposer
  - Navigation semaine/mois
- [ ] **Tests complets**
  - Vérification du drag & drop
  - Validation des contraintes (1 recette/1 créneau)
- [ ] **Documentation**
  - Mise à jour du README
  - Documentation technique

**Livrable** : Version permettant de planifier les repas manuellement

---

### **Itération 2 - Liste de Courses + Partage (2 semaines)**
**Objectif** : Ajouter la génération automatique de listes et le partage

- [ ] **F05 - Génération de liste de courses** (2-3 jours)
- [ ] **F04 - Export ICS + Page publique** (3-4 jours)
- [ ] **Tests**
  - Vérification de l'export ICS
  - Validation des jetons d'accès
- [ ] **Améliorations UX**
  - Feedback visuel après actions
  - Notifications toast

**Livrable** : Version permettant de générer des listes et de partager le planning

---

### **Itération 3 - Suggestions et Historique (1 semaine)**
**Objectif** : Ajouter l'intelligence à l'application

- [ ] **F03 - Proposition de repas** (1-2 jours)
- [ ] **F08 - Historique** (1 jour)
- [ ] **F09 - Antidoublon** (1 jour)
- [ ] **Tests utilisateurs**

**Livrable** : Version avec suggestions intelligentes

---

### **Itération 4 - Fonctionnalités Avancées (2-3 semaines)**
**Objectif** : Ajouter les dernières fonctionnalités

- [ ] **F07 - Import de recettes** (2-3 jours)
- [ ] **F10 - Notifications** (2 jours)
- [ ] **F11 - Garde-manger** (2-3 jours)
- [ ] **F12 - PWA** (2-3 jours)

**Livrable** : Version complète avec toutes les fonctionnalités

---

## 🗺️ **Roadmap Visuelle**

```
PHASE 1 (MVP)          PHASE 2 (Base)          PHASE 3 (Intelligent)    PHASE 4 (Avancé)
━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━
▼                    ▼                    ▼                    ▼
F01 Calendrier      F05 Liste           F03 Suggestions      F07 Import
                 + Courses          + Historique          + Notifs
                   F04 Partage       + Antidoublon        + Garde-manger
                                                       + PWA
━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━
  2-3 semaines        2 semaines          1 semaine          2-3 semaines
```

---

## 📁 **Architecture Technique Cible**

### **Nouveaux Fichiers à Créer**

```
meal_plan/
├── app/
│   ├── calendar/                  # NOUVEAU
│   │   ├── page.tsx              # Page calendrier principal
│   │   ├── CalendarClient.tsx    # Composant client avec dnd-kit
│   │   ├── CalendarWeekView.tsx  # Vue hebdomadaire
│   │   ├── CalendarDayView.tsx   # Vue quotidienne
│   │   └── CalendarEvent.tsx     # Composant d'événement de calendrier
│   │
│   ├── shopping-list/            # NOUVEAU
│   │   ├── page.tsx             # Page liste de courses
│   │   └── ShoppingListClient.tsx
│   │
│   ├── public/                  # NOUVEAU
│   │   └── calendar/
│   │       └── page.tsx         # Page publique avec jeton
│   │
│   ├── api/
│   │   ├── calendar/
│   │   │   ├── ics/             # NOUVEAU
│   │   │   │   └── route.ts    # Export ICS
│   │   │   └── public/         # NOUVEAU
│   │   │       └── route.ts    # API accès public
│   │   └── notifications/       # NOUVEAU (optionnel)
│   │       └── route.ts
│   │
│   └── pantry/                  # NOUVEAU (optionnel)
│       └── page.tsx
│
├── lib/
│   └── db/
│       ├── schema.ts           # MODIFIÉ (ajouts)
│       └── migrations/          # NOUVEAUX fichiers
│           ├── 0002_create_meal_plans.sql
│           ├── 0003_create_access_tokens.sql
│           └── 0004_create_pantry_items.sql
│
├── public/
│   └── manifest.json           # NOUVEAU (PWA)
│
└── app/
    └── sw.ts                   # NOUVEAU (Service Worker)
```

### **Schémas de Base de Données**

#### **Table: meal_plans** (F01)
```sql
-- Planification des repas
CREATE TABLE meal_plans (
  id TEXT PRIMARY KEY DEFAULT (uuid()),
  date TEXT NOT NULL,           -- Format: YYYY-MM-DD
  meal_type TEXT NOT NULL,     -- 'breakfast' | 'lunch' | 'dinner'
  recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
  servings INTEGER DEFAULT 1,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### **Table: access_tokens** (F04)
```sql
-- Jetons d'accès pour le partage public
CREATE TABLE access_tokens (
  id TEXT PRIMARY KEY DEFAULT (uuid()),
  token TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,          -- 'calendar_read' | 'api'
  expires_at TEXT NOT NULL,    -- Date d'expiration
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_revoked BOOLEAN DEFAULT FALSE
);
```

#### **Table: pantry_items** (F11)
```sql
-- Stock du garde-manger
CREATE TABLE pantry_items (
  id TEXT PRIMARY KEY DEFAULT (uuid()),
  ingredient_id TEXT REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  expiry_date TEXT,            -- Optionnel
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📊 **État d'Avancement**

### **Fonctionnalités Implémentées** : ~40%
- ✅ Authentification complète
- ✅ Gestion utilisateurs
- ✅ Gestion recettes et ingrédients
- ✅ Design responsive

### **Fonctionnalités à Implémenter** : ~60%
- ⏳ F01 - Planification (MVP)
- ⏳ F05 - Liste de courses
- ⏳ F04 - Partage du planning
- ⏳ F03 - Proposition de repas
- ⏳ F08 - Historique
- ⏳ F09 - Antidoublon
- ⏳ F07 - Import de recettes
- ⏳ F10 - Notifications
- ⏳ F11 - Garde-manger
- ⏳ F12 - Mode hors-ligne
- ⏳ OAuth

### **Répartition par Priorité**
| Priorité | Fonctionnalités | % Complet | Temps Estimé |
|----------|-----------------|-----------|--------------|
| 🔴 HAUTE | F01, Auth, Recettes | 60% | 3-5 jours |
| 🟡 MOYENNE | F05, F04, F03 | 0% | 6-10 jours |
| 🟢 BASSE | F08, F09, F07, F10, F11, F12 | 0% | 8-14 jours |

---

## 🎯 **Prochaines Actions Immediates**

### **Pour la branche `feature/calendrier`** (en cours)
1. ✅ Lire et analyser le cahier des charges
2. ✅ Créer ce document ROADMAPV2.md
3. [ ] **Commencer l'implémentation de F01**
   - [ ] Créer la table `meal_plans`
   - [ ] Créer la page `/calendar`
   - [ ] Implémenter le composant calendrier avec dnd-kit
   - [ ] Ajouter les Server Actions pour la gestion du planning

### **Priorité Immédiate**
- **F01 - Calendrier** : C'est la fonctionnalité centrale du MVP
- **Tests** : Vérifier que chaque fonctionnalité fonctionne avant de passer à la suivante
- **Documentation** : Mettre à jour le README et la ROADMAP au fur et à mesure

---

## 🔗 **Ressources et Références**

- [Cahier des Charges](meal_plan_requirements.md) - Spécifications complètes
- [ROADMAP Originale](ROADMAP.md) - État actuel du projet
- [Documentation Next.js](https://nextjs.org/docs)
- [dnd-kit Documentation](https://dndkit.com/)
- [Drizzle ORM](https://orm.drizzle.team/)

---

## 📞 **Contact & Support**

Pour toute question sur la planification :
1. Consulter ce document
2. Vérifier le [cahier des charges](meal_plan_requirements.md)
3. Regarder les commits récents pour voir les exemples d'implémentation

---

*Document généré pour planifier l'atteinte complète du cahier des charges.*
