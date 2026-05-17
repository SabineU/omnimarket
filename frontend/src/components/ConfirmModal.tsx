// frontend/src/components/ConfirmModal.tsx
// A confirmation dialog built on top of the generic Modal.
// Shows a title, message, and two buttons: Cancel (secondary) and Confirm (destructive).
import Modal from './ui/Modal';
import { Button } from './ui';

interface ConfirmModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the user clicks Cancel or closes the modal */
  onCancel: () => void;
  /** Called when the user clicks the Confirm button */
  onConfirm: () => void;
  /** The main question or title */
  title: string;
  /** Additional descriptive text */
  message: string;
  /** Text for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Text for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Whether the confirm action is currently in progress */
  isLoading?: boolean;
}

function ConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
}: ConfirmModalProps): React.JSX.Element {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} ariaLabel={title}>
      {/* Title */}
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>

      {/* Message */}
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{message}</p>

      {/* Action buttons */}
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          data-testid="confirm-modal-cancel"
        >
          {cancelLabel}
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          loading={isLoading}
          data-testid="confirm-modal-confirm"
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmModal;
