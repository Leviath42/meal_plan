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
    
    const formData = new FormData(e.currentTarget);
    const result = await registerUser(null, formData);
    
    setFormState(result);
    
    if (result?.success) {
      router.refresh();
      e.currentTarget.reset();
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
    // Empêcher la suppression de soi-même (déjà géré dans deleteUser, mais on vérifie aussi ici pour l'UX)
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

  // Rediriger si connecté mais pas admin
  if (session && session.user?.role !== 'ADMIN') {
    router.push('/');
    return null;
  }

  return (
    <main className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {session?.user?.role === 'ADMIN' ? 'Gestion des utilisateurs' : 'Créer un compte'}
        </h1>

        {formState?.message && (
          <div className={`mb-6 p-4 rounded ${formState.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {formState.message}
          </div>
        )}

        {formState?.errors?.form && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {formState.errors.form[0]}
          </div>
        )}

        {/* Formulaire d'inscription (pour les visiteurs et admin) */}
        {!session && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Créer un nouveau compte</h2>
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Votre nom"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.name && (
                  <p className="text-red-500 text-sm mt-1">{formState.errors.name[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="votre@email.com"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.email && (
                  <p className="text-red-500 text-sm mt-1">{formState.errors.email[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  minLength={6}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.password && (
                  <p className="text-red-500 text-sm mt-1">{formState.errors.password[0]}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 transition-colors"
              >
                Créer un compte
              </button>
            </form>

            <p className="mt-4 text-sm text-gray-600">
              Votre compte sera validé par un administrateur avant de pouvoir vous connecter.
            </p>
          </div>
        )}

        {/* Liste des utilisateurs à valider (pour l'admin) */}
        {session?.user?.role === 'ADMIN' && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Utilisateurs à valider</h2>
            
            {initialUsers.length === 0 ? (
              <p className="text-gray-600">Aucun utilisateur en attente de validation.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom
                      </th>
                      <th className="px-4 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rôle
                      </th>
                      <th className="px-4 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Créé le
                      </th>
                      <th className="px-4 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {initialUsers.map((user) => (
                      <tr key={user.id} className={user.role === 'GUEST' ? 'bg-yellow-50' : ''}>
                        <td className="px-4 py-3 sm:px-6 whitespace-nowrap text-sm text-gray-900">
                          {user.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 sm:px-6 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 sm:px-6 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                            user.role === 'MEMBER' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 sm:px-6 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 sm:px-6 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-1 sm:gap-2 flex-wrap">
                            {user.role === 'GUEST' && (
                              <button
                                onClick={() => handleUpdateRole(user.id, 'MEMBER')}
                                className="text-green-600 hover:text-green-800 px-1 py-1 sm:px-2 whitespace-nowrap text-xs sm:text-sm"
                              >
                                Valider
                              </button>
                            )}
                            {user.role === 'MEMBER' && (
                              <>
                                <button
                                  onClick={() => handleUpdateRole(user.id, 'ADMIN')}
                                  className="text-blue-600 hover:text-blue-800 px-1 py-1 sm:px-2 whitespace-nowrap text-xs sm:text-sm"
                                >
                                  Promouvoir
                                </button>
                                <button
                                  onClick={() => handleUpdateRole(user.id, 'GUEST')}
                                  className="text-orange-600 hover:text-orange-800 px-1 py-1 sm:px-2 whitespace-nowrap text-xs sm:text-sm"
                                >
                                  Rétrograder
                                </button>
                              </>
                            )}
                            {user.role === 'ADMIN' && user.id !== currentUserId && (
                              <button
                                onClick={() => handleUpdateRole(user.id, 'MEMBER')}
                                className="text-orange-600 hover:text-orange-800 px-1 py-1 sm:px-2 whitespace-nowrap text-xs sm:text-sm"
                              >
                                Rétrograder
                              </button>
                            )}
                            {user.id !== currentUserId && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-800 px-1 py-1 sm:px-2 whitespace-nowrap text-xs sm:text-sm"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Formulaire d'inscription pour l'admin */}
        {session?.user?.role === 'ADMIN' && (
          <div className="bg-white rounded-lg shadow-md p-8 mt-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Ajouter un utilisateur</h2>
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Nom de l'utilisateur"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.name && (
                  <p className="text-red-500 text-sm mt-1">{formState.errors.name[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@exemple.com"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.email && (
                  <p className="text-red-500 text-sm mt-1">{formState.errors.email[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  minLength={6}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formState?.errors?.password && (
                  <p className="text-red-500 text-sm mt-1">{formState.errors.password[0]}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 transition-colors"
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
