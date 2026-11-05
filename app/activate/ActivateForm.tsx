'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { activateLicense } from '@/app/actions/license';

export function ActivateForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(activateLicense, null);

  if (state?.success) {
    router.push('/');
    router.refresh();
  }

  return (
    <form action={action} className="space-y-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-700 p-4">
      <label className="block text-xs font-medium">
        Clé de licence (reçue par email après achat)
        <input
          name="key"
          required
          placeholder="MP-XXXX-XXXX-XXXX-XXXX"
          autoComplete="off"
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono uppercase"
        />
      </label>
      {state?.errors?.key && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.errors.key[0]}</p>}
      {state?.errors?.form && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.errors.form[0]}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-accent text-white rounded px-4 py-2 text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {pending ? 'Vérification…' : 'Activer la licence'}
      </button>
    </form>
  );
}
