# Meal Plan - Roadmap & Revue Technique

*Dernière mise à jour : 2026-10-06*

---

## 📋 **Contexte du Projet**

Application web de **planification des repas et gestion de recettes** familiale.
Stack technique : Next.js 16, Tailwind CSS, Drizzle ORM, SQLite (better-sqlite3), NextAuth v5.

---

## ✅ **Fonctionnalités Implémentées**

### 🔐 **Système d'Authentification**
- ✅ Connexion par credentials (email/mot de passe)
- ✅ Hash des mots de passe avec Argon2
- ✅ Gestion des sessions JWT (30 jours)
- ✅ Rôles utilisateurs : ADMIN, MEMBER, GUEST
- ✅ Secret JWT configuré (AUTH_SECRET)

### 👥 **Gestion des Utilisateurs**
- ✅ **Inscription publique** via `/register`
  - Créé avec rôle **GUEST** par défaut
  - **Ne peut pas se connecter** tant qu'un admin ne valide pas
  - Validation email, mot de passe (min 6 caractères), nom requis
  
- ✅ **Interface Admin** via `/register`
  - Liste tous les utilisateurs avec filtrage visuel (GUEST = fond jaune)
  - **Validation** : GUEST → MEMBER
  - **Promotion** : MEMBER → ADMIN
  - **Rétrogradation** : ADMIN → MEMBER (sauf soi-même)
  - **Suppression** : Supprimer un utilisateur (avec confirmation)
  - Formulaire de création directe d'utilisateur

### 👤 **Page de Profil Utilisateur** *(Nouveau 2026-10-06)*
- ✅ Affichage des informations utilisateur (nom, email, rôle)
- ✅ Changement de mot de passe avec validation
- ✅ Message d'attente pour les GUEST
- ✅ Déconnexion automatique après changement de mot de passe

### 🍳 **Gestion des Recettes** *(existait avant le rollback)*
- ✅ CRUD complet des recettes
- ✅ Association recettes/ingrédients
- ✅ Gestion des quantités et unités

### 🥕 **Gestion des Ingrédients** *(existait avant le rollback)*
- ✅ CRUD complet des ingrédients
- ✅ Catégories (rayons supermarché)
- ✅ Unités par défaut

### 🎨 **Responsive Design & UI**
- ✅ **Design responsive mobile-first**
- ✅ Largeur maximale cohérente sur desktop (`max-w-2xl`, `max-w-4xl`, `max-w-6xl`)
- ✅ Contraintes de largeur sur tous les conteneurs principaux
- ✅ Compatibilité Next.js 16 (conteneurs flexibles et fluides)
- ✅ Correction viewport pour Next.js 16 (export séparé de `metadata` et `viewport`)
- ✅ **SessionProvider** ajouté au layout principal pour NextAuth v5

---

## 🚀 **Prochaines Étapes (Priorité)**

### 0️⃣ **Fixes Techniques** *(Terminé 2026-10-06)*
- ✅ Correction du viewport pour Next.js 16 (export séparé)
- ✅ Fix du responsive design desktop (largeurs maximales)
- ✅ Uniformisation des conteneurs sur toutes les pages
- ✅ Correction Server Action pour changement de mot de passe (appel direct au lieu de fetch)
- ✅ Ajout SessionProvider au layout principal
- ✅ Page profil fonctionnelle avec changement de mot de passe

### 1️⃣ **Test et Validation** *(Terminé 2026-10-06)*
- ✅ Tester l'inscription d'un nouvel utilisateur
- ✅ Vérifier que le GUEST ne peut pas se connecter
- ✅ Tester la validation par l'admin (GUEST → MEMBER)
- ✅ Tester la connexion après validation
- ✅ Tester la suppression d'un utilisateur

**Scénarios de test :**
```
1. Visiteur → /register → crée compte test@exemple.com/test123
2. Tentative de connexion → ÉCHEC (GUEST non autorisé)
3. Admin (admin@mealplan.local/admin123) → /register → valide test@exemple.com
4. test@exemple.com → connexion → SUCCÈS (rôle MEMBER)
5. Admin → supprime test@exemple.com → utilisateur disparu
```

### 2️⃣ **Améliorations Authentification** *(Haute Priorité)*
- ✅ Ajouter un message clair aux GUEST : "Votre compte est en attente de validation" (page /waiting-validation)
- ✅ Notification à l'admin lorsqu'un nouvel utilisateur s'inscrit (badge "NOUVEAU" sur les GUEST récents)
- ✅ Page de profil utilisateur (changer mot de passe, voir ses infos) (page /profile)
- [ ] Mot de passe oublié / réinitialisation

### 3️⃣ **Fonctionnalités Manquantes** *(Moyenne Priorité)*
- [ ] **OAuth** (Google, GitHub) - *Attendre d'avoir les variables d'environnement*
- [ ] Import/Export des recettes (JSON)
- [ ] Recherche avancée (par tags, ingrédients)
- [ ] Planification hebdomadaire automatique
- [ ] Génération de liste de courses intelligente

### 4️⃣ **Améliorations UX/UI** *(Basse Priorité)*
- [ ] Design plus moderne de la page de connexion
- [ ] Animations de chargement
- [ ] Messages de succès/erreur plus visibles
- [ ] Dark mode

---

## 📁 **Revue Technique des Fichiers**

### 🆕 **Nouveaux Fichiers** *(créés après le rollback)*

| Fichier | Rôle | Statut |
|---------|------|--------|
| `app/actions/auth.ts` | Server Actions pour la gestion des utilisateurs | ✅ Fonctionnel |
| `app/register/page.tsx` | Server Component - récupère session/utilisateurs | ✅ Fonctionnel |
| `app/register/RegisterClient.tsx` | Client Component - interface interactive | ✅ Fonctionnel |

### 📝 **Fichiers Modifiés** *(par rapport au commit 4b4a317)*

| Fichier | Modifications | Statut |
|---------|---------------|--------|
| `lib/auth.ts` | Ajout vérification rôle GUEST (bloque la connexion) | ✅ Fonctionnel |
| `proxy.ts` | Ajout `/register` aux routes publiques | ✅ Fonctionnel |
| `app/layout.tsx` | Séparation de `metadata` et `viewport` pour Next.js 16 | ✅ Fonctionnel |
| `app/page.tsx` | Ajout `max-w-2xl sm:max-w-4xl mx-auto` pour conteneur responsive | ✅ Fonctionnel |
| `app/recipes/page.tsx` | Ajout `max-w-4xl` conteneur + `max-w-2xl` pour la liste | ✅ Fonctionnel |
| `app/recipes/[id]/page.tsx` | Ajout `max-w-4xl` pour conteneur principal | ✅ Fonctionnel |
| `app/recipes/[id]/edit/EditRecipeForm.tsx` | Ajout `max-w-2xl` pour conteneur principal | ✅ Fonctionnel |
| `app/recipes/new/NewRecipeForm.tsx` | Ajout `max-w-2xl` pour conteneur principal | ✅ Fonctionnel |
| `app/ingredients/page.tsx` | Ajout `max-w-4xl` pour conteneur principal | ✅ Fonctionnel |
| `app/register/RegisterClient.tsx` | Ajout `max-w-4xl` conteneur + `max-w-2xl` pour les cartes + badge "NOUVEAU" pour GUEST | ✅ Fonctionnel |
| `app/Nav.tsx` | Ajout lien Profil dans menu desktop et mobile | ✅ Fonctionnel |
| `app/profile/page.tsx` | NOUVEAU : page profil utilisateur avec gestion mot de passe | ✅ Fonctionnel |
| `app/waiting-validation/page.tsx` | NOUVEAU : page d'attente de validation pour GUEST | ✅ Fonctionnel |
| `app/actions/auth.ts` | Ajout updateUserPassword + import signOut | ✅ Fonctionnel |
| `lib/auth.ts` | Modification authorize pour permettre connexion GUEST | ✅ Fonctionnel |
| `proxy.ts` | Ajout redirection GUEST vers /waiting-validation | ✅ Fonctionnel |

### 🗂️ **Structure Complète du Projet**

```
meal_plan/
├── app/
│   ├── actions/
│   │   ├── auth.ts          # ← NOUVEAU : gestion utilisateurs
│   │   ├── ingredients.ts   # gestion ingrédients
│   │   └── recipes.ts       # gestion recettes
│   │
│   ├── ingredients/
│   │   ├── IngredientRow.tsx
│   │   ├── NewIngredientForm.tsx
│   │   └── page.tsx
│   │
│   ├── login/
│   │   └── page.tsx        # connexion
│   │
│   ├── recipes/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   ├── [id]/
│   │   │   └── edit/
│   │   │       └── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   │
│   ├── register/
│   │   ├── RegisterClient.tsx  # ← NOUVEAU : Client Component
│   │   └── page.tsx            # ← NOUVEAU : Server Component
│   │
│   ├── layout.tsx
│   └── page.tsx
│
├── lib/
│   ├── auth.ts              # ← MODIFIÉ : bloquage GUEST
│   └── db/
│       ├── index.ts
│       └── schema.ts
│
├── proxy.ts                 # ← MODIFIÉ : route publique /register
├── package.json
├── README.md
└── sqlite.db               # Base de données
```

---

## 🔍 **Revue des Incohérences & Rationalisations**

### ✅ **Points Cohérents**

1. **Architecture Server/Client Components**
   - `app/register/page.tsx` (Server) → `app/register/RegisterClient.tsx` (Client)
   - ✅ Bonne séparation des responsabilités
   - ✅ Données chargées côté serveur
   - ✅ Interactivité côté client

2. **Gestion des Rôles**
   - GUEST = non validé, ne peut pas se connecter
   - MEMBER = utilisateur validé
   - ADMIN = peut gérer les utilisateurs
   - ✅ Logique cohérente dans `lib/auth.ts` et `app/actions/auth.ts`

3. **Server Actions**
   - `registerUser`, `updateUserRole`, `deleteUser`, `getAllUsers`
   - ✅ Bien séparées dans `app/actions/auth.ts`
   - ✅ Appelables depuis les formulaires

4. **Sécurité**
   - Mot de passe hashé avec Argon2
   - Vérification du rôle avant autorisation
   - ✅ Route `/register` publique (accessible sans connexion)

### ⚠️ **Points à Rationaliser**

#### 1. **Gestion des Erreurs**
- **Problème** : Messages d'erreur différents entre l'inscription et l'authentification
- **Solution** : Standardiser les messages d'erreur (ex: utiliser un système de codes)
- **Fichiers concernés** : `app/actions/auth.ts`, `lib/auth.ts`

#### 2. **Redondance de Code**
- **Problème** : Le formulaire d'inscription apparaît deux fois (pour les visiteurs et pour l'admin)
- **Solution** : Extraire un composant `RegistrationForm.tsx` réutilisable
- **Fichiers concernés** : `app/register/RegisterClient.tsx`

#### 3. **Validation des Données**
- **Problème** : Validation manuelle dans `validateRegisterInput` alors que Zod est disponible
- **Solution** : Créer un schéma Zod pour l'inscription (comme pour les ingrédients)
- **Exemple** : 
  ```typescript
  // Dans lib/validators/auth.ts
  export const userInput = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1)
  });
  ```

#### 4. **Gestion des Dates**
- **Problème** : Formatage des dates en dur dans le tableau des utilisateurs
- **Solution** : Utiliser un utilitaire de formatage (ex: `date-fns` ou `Intl.DateTimeFormat`)
- **Fichiers concernés** : `app/register/RegisterClient.tsx`

#### 5. **Messages de Feedback**
- **Problème** : Après validation, pas de feedback visuel immédiat (nécessite un refresh)
- **Solution** : Utiliser `revalidatePath` ou un système de toast notifications
- **Fichiers concernés** : `app/actions/auth.ts`

### 🚨 **Problèmes Potentiels**

#### 1. **Conflits de Noms**
- **Problème** : La fonction `auth` est importée depuis `@/lib/auth` et aussi utilisée comme nom de variable
- **Fichiers concernés** : `app/register/RegisterClient.tsx`
- **Solution** : Renommer la variable (ex: `sessionData`)

#### 2. **Gestion des Conflits de Session**
- **Problème** : Si un admin supprime son propre compte, que se passe-t-il ?
- **Solution** : Ajouter une vérification dans `deleteUser` pour empêcher la suppression de soi-même
- **Code à ajouter** :
  ```typescript
  if (userId === session.user.id) {
    return { errors: { form: ['Vous ne pouvez pas supprimer votre propre compte'] } };
  }
  ```

#### 3. **Doublons d'Utilisateurs**
- **Problème** : Pas de vérification en cas de conflit d'email lors de la mise à jour du rôle
- **Solution** : Ajouter une vérification unique sur l'email dans `updateUserRole`

---

## 🛠️ **Améliorations Techniques Recommandées**

### 1. **Ajouter un Schema Zod pour l'Inscription**

**Fichier** : `lib/validators/auth.ts` *(à créer)*

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court (minimum 6 caractères)'),
  name: z.string().min(1, 'Nom requis')
});

export type RegisterInput = z.infer<typeof registerSchema>;
```

**Avantages** :
- Validation cohérente avec le reste du projet
- Meilleure typage TypeScript
- Messages d'erreur standardisés

### 2. **Extraire le Formulaire d'Inscription**

**Fichier** : `app/register/RegistrationForm.tsx` *(à créer)*

```typescript
'use client';

import { registerUser } from '@/app/actions/auth';

interface RegistrationFormProps {
  onSuccess?: () => void;
}

export default function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  // Logique du formulaire
  return <form>...</form>;
}
```

**Avantages** :
- Évite la duplication de code
- Plus facile à maintenir
- Réutilisable

### 3. **Améliorer la Gestion des Erreurs**

**Exemple d'amélioration** :

```typescript
// Dans app/actions/auth.ts
export type ActionResult = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: any;
};

// Utiliser partout le même type de retour
```

### 4. **Système de Notifications**

**Librairie recommandée** : `sonner` ou `react-toastify`

**Exemple** :
```typescript
// Dans app/layout.tsx
import { Toaster } from 'sonner';

// Dans le composant
<Toaster richColors />

// Dans les actions
import { toast } from 'sonner';
toast.success('Utilisateur validé avec succès !');
```

---

## 📊 **État des Tâches**

| Tâche | Statut | Priorité | Prochaine Action |
|-------|--------|----------|-----------------|
| Rollback vers commit stable | ✅ Terminée | 🔴 Urgent | - |
| Fix authentification | ✅ Terminée | 🔴 Urgent | - |
| Page d'inscription | ✅ Terminée | 🟡 Haute | - |
| Gestion admin des utilisateurs | ✅ Terminée | 🟡 Haute | - |
| Suppression utilisateur | ✅ Terminée | 🟡 Haute | - |
| Test complet | ✅ Terminée | 🔴 Urgent | - |
| Message GUEST validation | ✅ Terminée | 🟡 Haute | - |
| Notification admin GUEST | ✅ Terminée | 🟡 Haute | - |
| Page profil utilisateur | ✅ Terminée | 🟡 Moyenne | - |
| Schema Zod inscription | ⏳ En attente | 🟡 Moyenne | Créer le fichier |
| Rationalisation code | ⏳ En attente | 🟡 Moyenne | Extraire composants |
| Notifications utilisateur | ⏳ En attente | 🟢 Basse | Intégrer Sonner |
| OAuth (Google/GitHub) | ⏳ En attente | 🟢 Basse | Configurer env vars |
| Mot de passe oublié | ⏳ En attente | 🟢 Basse | Implémenter flux de réinitialisation |

---

## 🎯 **Résumé des Commit**

| Commit | Message | Modifications |
|--------|---------|---------------|
| 4b4a317 | Fix: Add AUTH_SECRET for NextAuth v5 JWT signing | Configuration auth de base |
| 3f7132b | feat + fix: Add user registration, admin management, fix module resolution | Système utilisateurs complet |
| 7639127 | Fin de la première journée :) | Base du projet |
| HEAD | **Dernières corrections** | Fix responsive desktop + viewport Next.js 16 |

---

## 📞 **Contact & Support**

Pour toute question ou problème, vérifier :
1. Les logs du serveur (`npm run dev`)
2. La base de données (`sqlite.db`)
3. Les variables d'environnement (`.env.local`)

**Identifiants de test par défaut :**
- Admin: `admin@mealplan.local` / `admin123`

---

*Document généré après le rollback et la réimplémentation du système d'inscription.*
