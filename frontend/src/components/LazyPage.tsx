// frontend/src/components/LazyPage.tsx
// Reusable Suspense wrapper for lazy‑loaded page components.
// Shows a centered spinner while the page chunk is downloading.
import { Suspense, type ComponentType } from 'react';
import { Spinner } from './ui';

/**
 * Props for LazyPage.
 * - component: the lazy‑loaded React component (returned by React.lazy)
 */
interface LazyPageProps {
  component: ComponentType;
}

function LazyPage({ component: Component }: LazyPageProps): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16" data-testid="lazy-page-spinner">
          <Spinner size="h-12 w-12" />
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}

export default LazyPage;
