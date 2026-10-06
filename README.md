# Meal Plan 🍳

Application web de **planification des repas et gestion de recettes** familiale.

## 🚀 Déploiement Local

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Accéder à l'application
http://localhost:3000
```

## 📋 Fonctionnalités

### ✅ Authentification
- Connexion par credentials (email/mot de passe)
- Hash des mots de passe avec Argon2
- Gestion des sessions JWT (30 jours)
- Rôles utilisateurs : ADMIN, MEMBER, GUEST

### ✅ Gestion des Utilisateurs
- Inscription publique avec validation admin
- Liste des utilisateurs avec filtrage par rôle
- Validation, promotion, rétrogradation et suppression
- Création directe d'utilisateurs par les admins

### ✅ Gestion des Recettes
- CRUD complet des recettes
- Association recettes/ingrédients
- Gestion des quantités, unités et descriptions

### ✅ Gestion des Ingrédients
- CRUD complet des ingrédients
- Catégories par rayons supermarché
- Unités par défaut configurables

### ✅ Interface Responsive
- Design mobile-first
- Largeurs maximales cohérentes sur desktop
- Compatibilité complète Next.js 16

## 🛠 Stack Technique

- **Framework**: Next.js 16 (App Router)
- **UI**: Tailwind CSS
- **ORM**: Drizzle ORM
- **Base de données**: SQLite (better-sqlite3)
- **Authentification**: NextAuth v5
- **Validation**: Zod

## 📁 Structure du Projet

```
meal_plan/
├── app/
│   ├── actions/           # Server Actions
│   ├── ingredients/       # Gestion des ingrédients
│   ├── login/            # Page de connexion
│   ├── recipes/          # Gestion des recettes
│   ├── register/         # Inscription & gestion utilisateurs
│   ├── layout.tsx        # Layout principal
│   └── page.tsx          # Page d'accueil
├── lib/
│   ├── auth.ts           # Configuration NextAuth
│   └── db/               # Schéma et connexion DB
├── proxy.ts             # Middleware proxy
├── package.json
├── README.md
└── ROADMAP.md
```

## 🔐 Identifiants de Test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | `admin@mealplan.local` | `admin123` |

## 📄 Documentation

- [ROADMAP.md](ROADMAP.md) - Revue technique et planification
- [meal_plan_requirements.md](meal_plan_requirements.md) - Cahier des charges détaillé

## 🎯 Prochaines Étapes

Voir la section **Prochaines Étapes** dans [ROADMAP.md](ROADMAP.md) pour la liste des tâches prioritaires.

## 🤝 Contribution

1. Forker le projet
2. Créer une branche de feature (`git checkout -b feature/nom-feature`)
3. Committer les changements (`git commit -m 'feat: description'`)
4. Pousser vers la branche (`git push origin feature/nom-feature`)
5. Ouvrir une Pull Request

## 📞 Support

Pour toute question, consulter la documentation ou vérifier les logs du serveur.

---

*Application développée avec ❤️ pour simplifier la planification des repas familiaux.*