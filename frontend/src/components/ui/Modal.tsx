// frontend/src/components/ui/Modal.tsx
// A generic, reusable modal shell.
// Renders an overlay + centred panel via a React Portal to document.body.
// Pressing Escape closes the modal. Clicking the backdrop closes the modal
// only if closeOnBackdrop is true.
import { useEffect, useRef, type ReactNode } from 'react'; // <-- removed KeyboardEvent
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
  // Keep a ref to the first focusable element so we can focus it when the modal opens
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    // Listener uses the global KeyboardEvent type, so no import is needed.
    const handleKeyDown = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent scrolling of the body while the modal is open
    document.body.style.overflow = 'hidden';

    // Focus the panel so keyboard events are received
    panelRef.current?.focus();

    // Cleanup function – must have an explicit return type per project lint rules.
    return (): void => {
      // <-- added :void
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Don't render anything if the modal is closed
  if (!isOpen) return null;

  // Render the modal into a portal attached to document.body.
  // This guarantees it sits above all other page content regardless of z‑index.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="alertdialog"
      aria-label={ariaLabel}
    >
      {/* Semi‑transparent backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
        data-testid="modal-backdrop"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        // tabIndex makes the div focusable so we can focus it on open
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
