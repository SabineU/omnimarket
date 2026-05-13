// frontend/src/components/ui/PasswordInput.tsx
// A password field that extends the shared Input component with a show/hide toggle.
import { useState, forwardRef, type InputHTMLAttributes } from 'react';
import Input from './Input';

// Re‑export the same props as Input, plus the forwarded ref
type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
};

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, icon, ...rest }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={show ? 'text' : 'password'}
          label={label}
          error={error}
          icon={icon}
          {...rest}
        />
        {/* Toggle button placed absolutely inside the right side of the input area */}
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="absolute right-3 top-[calc(50%+0.5rem)] -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors focus:outline-none"
          tabIndex={-1} // skip tabbing; the input itself is focused
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? (
            // Eye‑off icon (hidden)
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            // Eye icon (visible)
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
export default PasswordInput;
