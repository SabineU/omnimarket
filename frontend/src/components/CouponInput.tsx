// frontend/src/components/CouponInput.tsx
// A form that lets the user enter and apply a coupon code.
import { useState, type FormEvent } from 'react';
import { Button } from './ui';

interface CouponInputProps {
  /** Called when the user submits a coupon code */
  onApply: (code: string) => void;
  /** Called when the user clicks "Remove" to clear an applied coupon */
  onRemove: () => void;
  /** The currently applied coupon (null if none) */
  appliedCoupon: { code: string } | null;
  /** Whether a coupon validation request is currently in flight */
  isLoading: boolean;
  /** Any error message from the last validation attempt */
  error: string | null;
}

/**
 * CouponInput is a controlled form component.  It holds the coupon
 * code in local state and calls `onApply` when the user submits.
 */
function CouponInput({
  onApply,
  onRemove,
  appliedCoupon,
  isLoading,
  error,
}: CouponInputProps): React.JSX.Element {
  const [code, setCode] = useState<string>('');

  // Handler for the form submit event
  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault(); // Prevent page reload
    const trimmed = code.trim();
    if (trimmed.length > 0) {
      onApply(trimmed.toUpperCase()); // Coupon codes are typically uppercase
    }
  };

  // If a coupon is already applied, show it with a remove button
  if (appliedCoupon) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
          {/* Check icon */}
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {appliedCoupon.code}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-sm text-neutral-500 hover:text-error-500 transition-colors"
          data-testid="coupon-remove-button"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1">
        <label htmlFor="coupon-code" className="sr-only">
          Coupon code
        </label>
        <input
          id="coupon-code"
          type="text"
          placeholder="Enter coupon code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={isLoading}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
          data-testid="coupon-input"
        />
        {/* Show validation error below the input */}
        {error && (
          <p className="mt-1 text-xs text-error-500" data-testid="coupon-error">
            {error}
          </p>
        )}
      </div>
      <Button
        type="submit"
        variant="outline"
        size="sm"
        loading={isLoading}
        disabled={code.trim().length === 0}
        data-testid="coupon-apply-button"
      >
        Apply
      </Button>
    </form>
  );
}

export default CouponInput;
