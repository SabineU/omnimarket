// seller-frontend/src/components/ui/Spinner.tsx
// A simple loading spinner component.

interface SpinnerProps {
  /** Tailwind size classes, e.g. "h-12 w-12" */
  size?: string;
}

function Spinner({ size = 'h-12 w-12' }: SpinnerProps): React.JSX.Element {
  return (
    <svg
      className={`animate-spin ${size} text-primary-600`}
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
}

export default Spinner;
