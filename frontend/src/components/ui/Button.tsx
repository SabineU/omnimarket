// frontend/src/components/ui/Button.tsx
// Reusable button with multiple variants and loading state.
import { type ButtonHTMLAttributes, forwardRef } from 'react';

// Extend the native button props so consumers can pass onClick, type, disabled, etc.
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
  /** When true, shows a spinner and disables the button */
  loading?: boolean;
  /** Optional left icon (React node) */
  icon?: React.ReactNode;
}

// Map variant → Tailwind classes (light mode) + dark mode overrides
const variantStyles: Record<string, string> = {
  primary:
    'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 text-white ' +
    'dark:bg-primary-500 dark:hover:bg-primary-600',
  secondary:
    'bg-neutral-200 hover:bg-neutral-300 focus:ring-neutral-400 text-neutral-900 ' +
    'dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-100',
  outline:
    'border border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500 ' +
    'dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-950',
  danger:
    'bg-error-600 hover:bg-error-700 focus:ring-error-500 text-white ' +
    'dark:bg-error-500 dark:hover:bg-error-600',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3 text-lg',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      children,
      className = '',
      disabled,
      ...rest
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...rest}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {!loading && icon && <span className="h-5 w-5">{icon}</span>}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
