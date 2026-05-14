// frontend/src/components/MegaMenu.tsx
// A dropdown mega‑menu that displays the category tree when the user hovers or clicks "Shop".
// A short delay before hiding prevents the menu from closing when the cursor briefly
// leaves the button on its way to the panel.
import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { Spinner } from './ui';

function MegaMenu(): React.JSX.Element {
  const { data, isLoading, error } = useCategories();
  const [isOpen, setIsOpen] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending hide timer and show the menu
  const show = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    setIsOpen(true);
  }, []);

  // Start a short timer before hiding – moving back into the menu cancels it
  const hide = useCallback(() => {
    hideTimeout.current = setTimeout(() => {
      setIsOpen(false);
    }, 150); // 150ms delay is fast enough for normal use, but forgiving enough to cross the gap
  }, []);

  const toggle = (): void => setIsOpen((prev) => !prev); // <-- added return type

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      {/* Trigger button */}
      <button
        onClick={toggle}
        className="hover:text-primary-200 transition-colors text-sm font-medium flex items-center gap-1"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        Shop
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 md:w-80 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 p-4"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {isLoading && (
            <div className="flex justify-center py-4">
              <Spinner size="h-6 w-6" />
            </div>
          )}

          {error && <p className="text-sm text-error-500 py-2">Failed to load categories.</p>}

          {data && data.data.categories.length > 0 && (
            <ul className="grid grid-cols-2 gap-2">
              {data.data.categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/products?category=${cat.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2 text-sm rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-primary-900 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {data && data.data.categories.length === 0 && (
            <p className="text-sm text-neutral-500 py-2">No categories yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default MegaMenu;
