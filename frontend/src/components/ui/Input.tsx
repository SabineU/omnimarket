// frontend/src/components/ui/Input.tsx
// Reusable text / email / password input with optional label, icon, and error message.
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text shown above the input */
  label?: string;
  /** Error message – when present, the input border turns red and the message appears below */
  error?: string;
  /** Optional icon rendered inside the left side of the input */
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...rest }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {icon && (
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400 pointer-events-none">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 bg-white transition-colors
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:border-neutral-600
              ${icon ? 'pl-10' : ''}
              ${
                error
                  ? 'border-error-500 focus:ring-error-500 focus:border-error-500'
                  : 'border-neutral-300 dark:border-neutral-600'
              }
              ${className}`}
            {...rest}
          />
        </div>

        {/* Error message */}
        {error && <p className="mt-1 text-sm text-error-600 dark:text-error-400">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
