// frontend/src/components/ui/Modal.tsx
// A generic, reusable modal shell.
// Renders an overlay + centred panel via a React Portal to document.body.
// Pressing Escape closes the modal. Clicking the backdrop closes the modal
// only if closeOnBackdrop is true.
//
// FIXED: uses a ref for onClose, synced after render to avoid lint errors.
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when the user requests to close the modal (Escape, backdrop click) */
  onClose: () => void;
  /** Modal contents */
  children: ReactNode;
  /** Whether clicking the backdrop should close the modal (default: true) */
  closeOnBackdrop?: boolean;
  /** Accessible title for the dialog */
  ariaLabel: string;
}

function Modal({
  isOpen,
  onClose,
  children,
  closeOnBackdrop = true,
  ariaLabel,
}: ModalProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);

  // Store the latest onClose in a ref so the effect doesn't depend on it.
  // We update the ref in a useEffect to avoid mutating a ref during render.
  const onCloseRef = useRef(onClose);

  // Sync the ref after every render (this does not trigger a re‑render itself)
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Close on Escape key press and focus the panel (only when isOpen changes)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus the panel so keyboard events are received
    panelRef.current?.focus();

    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
    // onClose is stable via onCloseRef, so this effect only needs to re‑run
    // when isOpen changes.
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="alertdialog"
      aria-label={ariaLabel}
    >
      <div
        className="absolute inset-0 bg-black/50"
        // Wrap in an arrow function so we only read the ref when clicked,
        // not during render.
        onClick={() => {
          if (closeOnBackdrop) {
            onCloseRef.current();
          }
        }}
        aria-hidden="true"
        data-testid="modal-backdrop"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl focus:outline-none dark:bg-neutral-800"
        data-testid="modal-panel"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
