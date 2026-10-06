'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser, updateUserRole, deleteUser } from '@/app/actions/auth';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'MEMBER' | 'GUEST';
  createdAt: string;
}

interface RegisterClientProps {
  session: {
    user?: {
      id: string;
      email: string;
      name?: string | null;
      role?: 'ADMIN' | 'MEMBER' | 'GUEST';
    };
  } | null;
  users: User[];
  currentUserId?: string;
}

export default function RegisterClient({ session, users: initialUsers, currentUserId }: RegisterClientProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<{
    errors?: Record<string, string[]>;
    success?: boolean;
    message?: string;
  } | null>(null);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const result = await registerUser(null, formData);
    
    setFormState(result);
    
    if (result?.success) {
      // Reset le formulaire avant le refresh
      formElement.reset();
      router.refresh();
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'ADMIN' | 'MEMBER' | 'GUEST') => {
    const result = await updateUserRole(userId, newRole, currentUserId);
    setFormState(result);
    
    if (result?.success) {
      router.refresh();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      setFormState({ errors: { form: ['Vous ne pouvez pas supprimer votre propre compte'] } });
      return;
    }
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      const result = await deleteUser(userId, currentUserId);
      setFormState(result);
      
      if (result?.success) {
        router.refresh();
      }
    }
  };

  const getRoleColor = (role: 'ADMIN' | 'MEMBER' | 'GUEST') => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'MEMBER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const isNewUser = (createdAt: string): boolean => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    // Considérer comme "nouveau" si créé dans les dernières 24 heures
    return (now.getTime() - createdDate.getTime()) < 24 * 60 * 60 * 1000;
  };

  const getRoleActions = (user: User) => {
    const actions = [];
    
    if (user.role === 'GUEST') {
      actions.push({
        label: 'Valider',
        action: () => handleUpdateRole(user.id, 'MEMBER'),
        color: 'text-green-600 hover:text-green-800'
      });
    } else if (user.role === 'MEMBER') {
      actions.push({
        label: 'Promouvoir',
        action: () => handleUpdateRole(user.id, 'ADMIN'),
        color: 'text-blue-600 hover:text-blue-800'
      });
      actions.push({
        label: 'Rétrograder',
        action: () => handleUpdateRole(user.id, 'GUEST'),
        color: 'text-orange-600 hover:text-orange-800'
      });
    } else if (user.role === 'ADMIN' && user.id !== currentUserId) {
      actions.push({
        label: 'Rétrograder',
        action: () => handleUpdateRole(user.id, 'MEMBER'),
        color: 'text-orange-600 hover:text-orange-800'
      });
    }
    
    if (user.id !== currentUserId) {
      actions.push({
        label: 'Supprimer',
        action: () => handleDeleteUser(user.id),
        color: 'text-red-600 hover:text-red-800'
      });
    }
    
    return actions;
  };

  if (session && session.user?.role !== 'ADMIN') {
    router.push('/');
    return null;
  }

  return (
    <main className="min-h-screen px-3 sm:px-4 py-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 px-2">
          {session?.user?.role === 'ADMIN' ? 'Gestion des utilisateurs' : 'Créer un compte'}
        </h1>

        {formState?.message && (
          <div className={`mb-4 px-3 py-2 rounded text-xs sm:text-sm ${formState.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {formState.message}
          </div>
        )}

        {formState?.errors?.form && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs sm:text-sm">
            {formState.errors.form[0]}
          </div>
        )}

        {/* Formulaire d'inscription (pour les visiteurs et admin) */}
        {!session && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 max-w-2xl mx-auto">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Créer un nouveau compte</h2>
            
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Votre nom"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.name && (
                  <p className="text-red-500 text-xs mt-1">{formState.errors.name[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="votre@email.com"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.email && (
                  <p className="text-red-500 text-xs mt-1">{formState.errors.email[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  minLength={6}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.password && (
                  <p className="text-red-500 text-xs mt-1">{formState.errors.password[0]}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Créer un compte
              </button>
            </form>

            <p className="mt-3 text-xs text-gray-500">
              Votre compte sera validé par un administrateur avant de pouvoir vous connecter.
            </p>
          </div>
        )}

        {/* Liste des utilisateurs */}
        {session?.user?.role === 'ADMIN' && (
          <div className="bg-white rounded-lg shadow-sm p-4 max-w-2xl mx-auto">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Utilisateurs</h2>
            
            {initialUsers.length === 0 ? (
              <p className="text-xs sm:text-sm text-gray-500">Aucun utilisateur en attente de validation.</p>
            ) : (
              <div className="space-y-3">
                {/* Filtres par rôle */}
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                  <span className="text-xs font-medium text-gray-500 uppercase whitespace-nowrap py-1">Filtres :</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${initialUsers.filter(u => u.role === 'GUEST').length > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-400'}`}>
                    {initialUsers.filter(u => u.role === 'GUEST').length} en attente
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${initialUsers.filter(u => u.role === 'MEMBER').length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                    {initialUsers.filter(u => u.role === 'MEMBER').length} membres
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${initialUsers.filter(u => u.role === 'ADMIN').length > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-400'}`}>
                    {initialUsers.filter(u => u.role === 'ADMIN').length} admins
                  </span>
                </div>

                {/* Liste des utilisateurs sous forme de cartes */}
                <div className="space-y-3">
                  {initialUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`bg-gray-50 rounded-lg p-3 border border-gray-200 ${user.role === 'GUEST' ? 'border-yellow-200 bg-yellow-50' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getRoleColor(user.role)}`}>
                              {user.role}
                            </span>
                            {user.role === 'GUEST' && isNewUser(user.createdAt) && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium flex-shrink-0">
                                NOUVEAU
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate text-xs sm:text-sm">
                                {user.name || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {user.email}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Créé le : {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions - stacked on mobile, inline on desktop */}
                        <div className="flex flex-wrap gap-1 sm:gap-2 sm:ml-4">
                          {getRoleActions(user).map((action, index) => (
                            <button
                              key={index}
                              onClick={action.action}
                              className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded hover:bg-gray-100 transition-colors whitespace-nowrap ${action.color}`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formulaire d'inscription pour l'admin */}
        {session?.user?.role === 'ADMIN' && (
          <div className="bg-white rounded-lg shadow-sm p-4 mt-3 max-w-2xl mx-auto">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Ajouter un utilisateur</h2>
            
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Nom de l'utilisateur"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.name && (
                  <p className="text-red-500 text-xs mt-1">{formState.errors.name[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@exemple.com"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.email && (
                  <p className="text-red-500 text-xs mt-1">{formState.errors.email[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  minLength={6}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.password && (
                  <p className="text-red-500 text-xs mt-1">{formState.errors.password[0]}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Créer l'utilisateur
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
