// frontend/src/components/ui/Spinner.tsx
// A standalone loading spinner, used inside buttons or for page‑level loading states.
interface SpinnerProps {
  /** Size in Tailwind classes (h-5 w-5, h-8 w-8, etc.) */
  size?: string;
  /** Colour (default primary) */
  color?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'h-5 w-5', color = 'text-primary-600' }) => {
  return (
    <svg
      className={`animate-spin ${size} ${color}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
};

export default Spinner;
