'use client';

import { useEffect, useState } from 'react';
import { formatNumericDate } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { registerUser, updateUserRole, deleteUser, getAllUsers } from '@/app/actions/auth';
import ConfirmDialog from '@/app/components/ConfirmDialog';

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
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null });
  const [formState, setFormState] = useState<{
    errors?: Record<string, string[]>;
    success?: boolean;
    message?: string;
  } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Liste vivante : les mutations rechargent explicitement via getAllUsers().
  // router.refresh() seul est insuffisant — son re-fetch peut être servi
  // depuis le cache du routeur et montrer des données périmées (C-028).
  const [users, setUsers] = useState<User[]>(initialUsers);

  const refreshUsers = async () => {
    try {
      const fresh = await getAllUsers();
      if (Array.isArray(fresh)) setUsers(fresh);
    } catch {
      // repli si l'appel échoue (session expirée) : rechargement classique
      router.refresh();
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const result = await registerUser(null, formData);
    
    setFormState(result);
    
    if (result?.success) {
      // Reset le formulaire avant le refresh
      formElement.reset();
      setShowCreateModal(false);
      refreshUsers();
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'ADMIN' | 'MEMBER' | 'GUEST') => {
    const result = await updateUserRole(userId, newRole);
    setFormState(result);
    
    if (result?.success) {
      refreshUsers();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      setFormState({ errors: { form: ['Vous ne pouvez pas supprimer votre propre compte'] } });
      return;
    }
    
    setConfirmDelete({ open: true, userId });
  };
  const confirmDeleteUser = async () => {
    if (!confirmDelete.userId) return;
    const result = await deleteUser(confirmDelete.userId);
    setFormState(result);

    if (result?.success) {
      refreshUsers();
    }
    setConfirmDelete({ open: false, userId: null });
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
        color: 'text-accent hover:text-accent'
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

  // Échap : fermer le modal de création d'utilisateur
  useEffect(() => {
    if (!showCreateModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowCreateModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal]);

  // Rediriger les non-admin dans un effet : un push pendant le rendu
  // est un anti-pattern React
  useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, router]);

  if (session && session.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <main className="px-3 sm:px-4 py-2 sm:py-3">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-3 px-2">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">
            {session?.user?.role === 'ADMIN' ? 'Gestion des utilisateurs' : 'Créer un compte'}
          </h1>
          {session?.user?.role === 'ADMIN' && (
            <button
              onClick={() => {
                setFormState(null);
                setShowCreateModal(true);
              }}
              className="bg-accent text-white rounded px-3 py-1.5 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              + Nouvel utilisateur
            </button>
          )}
        </div>

        {formState?.message && (
          <div className={`mb-3 px-3 py-2 rounded text-xs sm:text-sm ${formState.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {formState.message}
          </div>
        )}

        {formState?.errors?.form && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs sm:text-sm">
            {formState.errors.form[0]}
          </div>
        )}

        {/* Formulaire d'inscription (pour les visiteurs et admin) */}
        {!session && (
          <div className="bg-white rounded-lg shadow-sm p-3 mb-3 max-w-2xl mx-auto">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Créer un nouveau compte</h2>
            
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
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
                  autoComplete="username"
                  placeholder="votre@email.com"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
                  autoComplete="new-password"
                  placeholder="Minimum 10 caractères"
                  minLength={10}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {formState?.errors?.password && (
                  <p className="text-red-500 text-xs mt-1">{formState.errors.password[0]}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-accent text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors"
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
          <div className="bg-white rounded-lg shadow-sm p-3 max-w-2xl mx-auto">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Utilisateurs</h2>
            
            {users.length === 0 ? (
              <p className="text-xs sm:text-sm text-gray-500">Aucun utilisateur en attente de validation.</p>
            ) : (
              <div className="space-y-3">
                {/* Filtres par rôle */}
                <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                  <span className="text-xs font-medium text-gray-500 uppercase whitespace-nowrap py-1">Filtres :</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${users.filter(u => u.role === 'GUEST').length > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-400'}`}>
                    {users.filter(u => u.role === 'GUEST').length} en attente
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${users.filter(u => u.role === 'MEMBER').length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                    {users.filter(u => u.role === 'MEMBER').length} membres
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${users.filter(u => u.role === 'ADMIN').length > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-400'}`}>
                    {users.filter(u => u.role === 'ADMIN').length} admins
                  </span>
                </div>

                {/* Liste des utilisateurs sous forme de cartes */}
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`bg-gray-50 rounded-lg p-2 border border-gray-200 ${user.role === 'GUEST' ? 'border-yellow-200 bg-yellow-50' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getRoleColor(user.role)}`}>
                              {user.role}
                            </span>
                            {user.role === 'GUEST' && isNewUser(user.createdAt) && (
                              <span className="px-2 py-0.5 bg-accent-soft text-accent rounded text-xs font-medium flex-shrink-0">
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
                                Créé le : {formatNumericDate(new Date(user.createdAt))}
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

        {/* Modal de création d'utilisateur (admin) */}
        {showCreateModal && session?.user?.role === 'ADMIN' && (
          <div role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-modal-title"
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 id="create-user-modal-title" className="font-bold text-lg">Ajouter un utilisateur</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                  aria-label="Fermer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleRegister} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
                <div>
                  <label htmlFor="admin-name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    id="admin-name"
                    name="name"
                    type="text"
                    placeholder="Nom de l'utilisateur"
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  {formState?.errors?.name && (
                    <p className="text-red-500 text-xs mt-1">{formState.errors.name[0]}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="admin-email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    autoComplete="off"
                    placeholder="email@exemple.com"
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  {formState?.errors?.email && (
                    <p className="text-red-500 text-xs mt-1">{formState.errors.email[0]}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="admin-password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Mot de passe
                  </label>
                  <input
                    id="admin-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimum 10 caractères"
                    minLength={10}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  {formState?.errors?.password && (
                    <p className="text-red-500 text-xs mt-1">{formState.errors.password[0]}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="sm:col-span-3 w-full bg-accent text-white rounded py-2 text-xs sm:text-sm font-medium hover:bg-accent-hover transition-colors"
                >
                  Créer l'utilisateur
                </button>
              </form>
            </div>
          </div>
        )}
            <ConfirmDialog
        open={confirmDelete.open}
        title="Supprimer cet utilisateur"
        message={<>Êtes-vous sûr de vouloir supprimer ce compte utilisateur&nbsp;? Cette action est irréversible.</>}
        onCancel={() => setConfirmDelete({ open: false, userId: null })}
        onConfirm={confirmDeleteUser}
      />
    </div>
    </main>
  );
}
