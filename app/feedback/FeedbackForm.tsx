'use client';

import { useActionState, useState } from 'react';
import { submitFeedback } from '@/app/actions/feedback';
import type { FeedbackFormState } from '@/lib/validators/feedback';

type CategoryOption = { value: string; label: string };

// Formulaire de retour en 3 clics : catégorie → message → envoyer.
// page_url et app_version sont capturés côté serveur (referer + package.json).
export default function FeedbackForm({ categoryOptions }: { categoryOptions: CategoryOption[] }) {
  const [state, formAction, pending] = useActionState<FeedbackFormState, FormData>(
    submitFeedback,
    null
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [formKey, setFormKey] = useState(0);

  const fieldError = (field: string) => state?.errors?.[field]?.[0];

  // Le retour a été envoyé : on affiche la confirmation à la place du
  // formulaire ; « envoyer un autre retour » remet tout à zéro.
  if (state?.success) {
    return (
      <div className="rounded border border-accent bg-accent-soft p-4 space-y-3">
        <p className="text-sm font-medium">{state.message}</p>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setMessage('');
            setFormKey((k) => k + 1);
          }}
          className="bg-accent text-white rounded px-3 py-2 text-xs sm:text-sm hover:bg-accent-hover transition-colors"
        >
          Envoyer un autre retour
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} key={formKey} className="space-y-4">
      {/* Étape 1 : catégorie (un clic, boutons radio masqués) */}
      <fieldset>
        <legend className="text-xs font-medium mb-2">Catégorie</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {categoryOptions.map((opt) => (
            <label
              key={opt.value}
              className={`rounded border px-3 py-2 text-center text-xs sm:text-sm cursor-pointer transition-colors ${
                selected === opt.value
                  ? 'border-accent bg-accent-soft font-medium'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="category"
                value={opt.value}
                required
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {fieldError('category') && (
          <p role="alert" className="text-xs text-red-600 mt-1">
            {fieldError('category')}
          </p>
        )}
      </fieldset>

      {/* Étape 2 : message */}
      <label className="block text-xs font-medium">
        Votre message
        <textarea
          name="message"
          required
          maxLength={1000}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Décrivez ce qui se passe, ce que vous aimeriez, votre question…"
          className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
        />
      </label>
      {fieldError('message') && (
        <p role="alert" className="text-xs text-red-600 -mt-2">
          {fieldError('message')}
        </p>
      )}

      {/* Étape 3 : envoyer */}
      <button
        type="submit"
        disabled={pending}
        className="bg-accent text-white rounded px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {pending ? 'Envoi…' : 'Envoyer'}
      </button>

      {state && !state.success && state.message && (
        <p role="alert" className="text-xs sm:text-sm text-red-600">
          {state.message}
        </p>
      )}
    </form>
  );
}
