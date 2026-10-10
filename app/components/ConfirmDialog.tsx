'use client';

// Modal de confirmation accessible : remplace les window.confirm() natifs
// (non stylés, incohérents avec le thème sombre et l'UX mobile).
// - role="dialog" aria-modal, titre lié par aria-labelledby
// - fermeture par Échap ou clic sur l'overlay (paramétrable)
// - focus piégé dans le modal, rendu au bouton Annuler à l'ouverture,
//   restitué à l'élément déclencheur à la fermeture
import { useEffect, useRef, type ReactNode } from 'react';

// Sélecteurs des éléments focusables pour le piège de focus
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  destructive = true,
  pending = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  // destructive : bouton de confirmation en rouge (suppression, révocation)
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Échap : annuler ; piège de focus à l'intérieur du modal ; restitution du
  // focus à l'élément qui a ouvert le dialog à la fermeture
  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [open, onCancel]);

  // Bloquer le scroll de fond pendant l'ouverture
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-white rounded-lg shadow-lg max-w-md w-full"
      >
        <div className="p-4 border-b">
          <h3 id="confirm-dialog-title" className="font-bold text-lg text-gray-800">
            {title}
          </h3>
        </div>
        <div className="p-4">
          <div className="text-sm text-gray-700">{message}</div>
          {children}
          <div className="flex gap-3 justify-end mt-4">
            <button
              ref={cancelRef}
              onClick={onCancel}
              disabled={pending}
              className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={pending}
              className={`px-4 py-2 text-white rounded transition-colors disabled:opacity-50 ${
                destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-accent hover:bg-accent-hover'
              }`}
            >
              {pending ? '…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
