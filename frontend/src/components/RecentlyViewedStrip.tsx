// frontend/src/components/RecentlyViewedStrip.tsx
// Horizontal strip of recently viewed products.
// Fetches product details from the backend using a list of IDs
// and displays them as small cards with images, names, and prices.
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import { Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Lightweight product shape returned by the recently‑viewed endpoint */
interface RecentlyViewedProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number | string;
  images: { url: string; altText: string }[];
  averageRating: number | null;
  reviewCount: number;
}

interface RecentlyViewedResponse {
  status: string;
  data: {
    products: RecentlyViewedProduct[];
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a price (number or string) for display */
function formatPrice(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isNaN(num) ? '0.00' : num.toFixed(2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RecentlyViewedStripProps {
  /** List of product IDs (most recent first) */
  ids: string[];
}

function RecentlyViewedStrip({ ids }: RecentlyViewedStripProps): React.JSX.Element | null {
  // Fetch product details when the ids list is non‑empty
  const { data, isLoading, error } = useQuery<RecentlyViewedResponse, Error>({
    queryKey: ['recently-viewed', ids],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('ids', ids.join(','));
      const { data } = await apiClient.get<RecentlyViewedResponse>(
        `/products/recently-viewed?${params.toString()}`,
      );
      return data;
    },
    // Only run the query when there are IDs to fetch
    enabled: ids.length > 0,
    // Keep data fresh for 2 minutes
    staleTime: 2 * 60 * 1000,
  });

  // If no IDs, don't render anything
  if (ids.length === 0) return null;

  const products = data?.data.products ?? [];

  // ---- Loading state ----
  if (isLoading) {
    return (
      <section className="mb-12" data-testid="recently-viewed-section">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
          Recently Viewed
        </h2>
        <div className="flex items-center gap-4 py-4">
          <Spinner size="h-6 w-6" />
          <span className="text-sm text-neutral-500">Loading your recent items…</span>
        </div>
      </section>
    );
  }

  // ---- Error or empty: silently hide the section (non‑critical feature) ----
  if (error || products.length === 0) return null;

  // ---- Success: show the scrollable strip ----
  return (
    <section className="mb-12" data-testid="recently-viewed-section">
      <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
        Recently Viewed
      </h2>

      {/* Horizontally scrollable container */}
      <div className="flex gap-4 overflow-x-auto pb-2" data-testid="recently-viewed-strip">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.slug}`}
            className="flex-shrink-0 w-40 sm:w-48 group"
            data-testid={`recently-viewed-product-${product.slug}`}
          >
            <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow dark:border-neutral-700 dark:bg-neutral-800 h-full flex flex-col">
              {/* Product image */}
              <div className="aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700 mb-2">
                {product.images[0] ? (
                  <img
                    src={product.images[0].url}
                    alt={product.images[0].altText ?? product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              {/* Product name */}
              <h3 className="text-xs font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2 flex-1">
                {product.name}
              </h3>
              {/* Price */}
              <p className="mt-1 text-sm font-bold text-primary-600">
                ${formatPrice(product.basePrice)}
              </p>
              {/* Rating (if any) */}
              {product.averageRating !== null && (
                <p className="text-xs text-neutral-500 mt-0.5">
                  ⭐ {product.averageRating.toFixed(1)}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default RecentlyViewedStrip;
