// frontend/src/components/RecentlyViewedStrip.tsx
// Horizontal carousel of recently viewed products.
// Uses CSS scroll‑snap with trailing padding so that only whole cards
// are ever visible, never a partially cut card.
import { useRef, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import { Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  data: { products: RecentlyViewedProduct[] };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isNaN(num) ? '0.00' : num.toFixed(2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RecentlyViewedStripProps {
  ids: string[];
}

function RecentlyViewedStrip({ ids }: RecentlyViewedStripProps): React.JSX.Element | null {
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
    enabled: ids.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // ---- Carousel scroll controls ----
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = useCallback((): void => {
    const el = containerRef.current;
    if (el) {
      // Allow a tiny tolerance for floating‑point differences
      setCanScrollLeft(el.scrollLeft > 1);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }
  }, []);

  const scroll = (direction: 'left' | 'right'): void => {
    const el = containerRef.current;
    if (el) {
      const card = el.querySelector('a');
      const cardWidth = card?.offsetWidth ?? 176;
      const gap = 16;
      const scrollAmount = cardWidth * 2 + gap;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollButtons, { passive: true });
      window.addEventListener('resize', checkScrollButtons);
      checkScrollButtons();
      return (): void => {
        el.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [checkScrollButtons, data]);

  if (ids.length === 0) return null;

  const products = data?.data.products ?? [];

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

  if (error || products.length === 0) return null;

  return (
    <section className="mb-12" data-testid="recently-viewed-section">
      <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
        Recently Viewed
      </h2>

      {/* Carousel wrapper – padding gives space for arrows outside the content */}
      <div className="relative group px-10">
        {/* ---- Left arrow ---- */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full p-2 shadow-md hover:shadow-lg transition-all opacity-0 group-hover:opacity-100"
            aria-label="Scroll left"
            data-testid="carousel-scroll-left"
          >
            <svg
              className="h-5 w-5 text-neutral-700 dark:text-neutral-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* ---- Right arrow ---- */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full p-2 shadow-md hover:shadow-lg transition-all opacity-0 group-hover:opacity-100"
            aria-label="Scroll right"
            data-testid="carousel-scroll-right"
          >
            <svg
              className="h-5 w-5 text-neutral-700 dark:text-neutral-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-neutral-50 to-transparent dark:from-neutral-900 z-[5]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-neutral-50 to-transparent dark:from-neutral-900 z-[5]" />

        {/* Scrollable container with snap points.
            pr‑40 on mobile (10rem = 160px = w‑40),
            sm:pr‑48 on wider screens (12rem = 192px = sm:w‑48).
            This extra padding ensures the last card can snap fully into view. */}
        <div
          ref={containerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory pr-40 sm:pr-48"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          data-testid="recently-viewed-strip"
        >
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.slug}`}
              className="flex-shrink-0 w-40 sm:w-48 group snap-start"
              data-testid={`recently-viewed-product-${product.slug}`}
            >
              <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow dark:border-neutral-700 dark:bg-neutral-800 h-full flex flex-col">
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
                      <svg
                        className="h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
                <h3 className="text-xs font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2 flex-1">
                  {product.name}
                </h3>
                <p className="mt-1 text-sm font-bold text-primary-600">
                  ${formatPrice(product.basePrice)}
                </p>
                {product.averageRating !== null && (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    ⭐ {product.averageRating.toFixed(1)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default RecentlyViewedStrip;
