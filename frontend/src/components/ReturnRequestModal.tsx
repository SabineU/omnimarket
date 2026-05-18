// frontend/src/components/ReturnRequestModal.tsx
// A modal form for customers to request a return/refund.
// Uses React Hook Form + Zod for validation.
// Built on top of the reusable Modal component.
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './ui/Modal';
import { Button } from './ui';

// ---------------------------------------------------------------------------
// Zod validation schema – reason must be at least 10 characters
// ---------------------------------------------------------------------------
const returnSchema = z.object({
  reason: z
    .string()
    .min(10, 'Please provide at least 10 characters explaining the reason.')
    .max(500, 'Reason must be 500 characters or fewer.'),
});

type ReturnFormValues = z.infer<typeof returnSchema>;

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------
interface ReturnRequestModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the user clicks Cancel or closes the modal */
  onCancel: () => void;
  /** Called when the form is submitted with valid data */
  onSubmit: (data: ReturnFormValues) => void;
  /** Whether the submission is currently in progress */
  isLoading: boolean;
}

function ReturnRequestModal({
  isOpen,
  onCancel,
  onSubmit,
  isLoading,
}: ReturnRequestModalProps): React.JSX.Element {
  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ReturnFormValues>({
    resolver: zodResolver(returnSchema),
    defaultValues: { reason: '' },
  });

  // Handle form submission – call the parent's onSubmit, then reset the form
  const handleFormSubmit = (data: ReturnFormValues): void => {
    onSubmit(data);
    reset(); // Clear the form for next time
  };

  // Handle cancel – reset form and call parent
  const handleCancel = (): void => {
    reset();
    onCancel();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} ariaLabel="Request a return">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Request a Return / Refund
      </h2>

      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Please tell us why you&apos;d like to return this item. Our team will review your request
        and get back to you within 2–3 business days.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-4 space-y-4" noValidate>
        {/* Reason textarea */}
        <div>
          <label
            htmlFor="return-reason"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Reason for return *
          </label>
          <textarea
            id="return-reason"
            rows={4}
            placeholder="e.g., Item arrived damaged, wrong size, not as described..."
            {...register('reason')}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            disabled={isLoading}
            data-testid="return-reason-input"
          />
          {/* Validation error */}
          {errors.reason && (
            <p className="mt-1 text-xs text-error-500" role="alert">
              {errors.reason.message}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            data-testid="return-modal-cancel"
          >
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} data-testid="return-modal-submit">
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ReturnRequestModal;
