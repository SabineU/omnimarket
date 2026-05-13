// frontend/src/components/ui/Card.tsx
// Simple card container with consistent padding, shadow, and rounded corners.
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional additional classes (e.g., hover effects) */
  className?: string;
  /** When true, the card has no padding (useful for image‑first cards) */
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false, ...rest }) => {
  return (
    <div
      className={`bg-white dark:bg-neutral-800 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-700 ${
        noPadding ? '' : 'p-5'
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;
