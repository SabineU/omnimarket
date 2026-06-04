// admin-frontend/src/components/LazyPage.tsx
// Reusable Suspense wrapper for lazy‑loaded page components.
import { Suspense, type ComponentType } from 'react';
import { Spinner } from './ui';

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
