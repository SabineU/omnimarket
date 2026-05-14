// frontend/src/pages/ProductsPage.tsx
// Product listing page with search, sidebar filters (category, price, sort),
// and infinite scrolling product grid.  All filters are stored in URL search params.
import { useSearchParams, Link } from 'react-router-dom';
import { useEffect, useRef, useCallback } from 'react';
import { useInfiniteProducts, type ProductFilters } from '../hooks/useInfiniteProducts';
import { useCategories } from '../hooks/useCategories';
import { Card, Input, Select, Button, Spinner, Breadcrumbs } from '../components/ui';
import WishlistButton from '../components/WishlistButton';

function ProductsPage(): React.JSX.Element {
  // ---------------------------------------------------------------------------
  // Read and write URL search params (e.g., ?search=laptop&category=electronics)
  // ---------------------------------------------------------------------------
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract filter values from the URL (or defaults)
  const search = searchParams.get('search') || undefined;
  const category = searchParams.get('category') || undefined;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const sort = searchParams.get('sort') || 'newest';

  // Build the filters object for the API hook (page is handled by the infinite query)
  const filters: ProductFilters = { search, category, minPrice, maxPrice, sort, limit: 12 };

  // Helper to update a single filter and reset the page to 1
  const updateFilter = (key: string, value: string | undefined): void => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set('page', '1'); // always reset to first page when a filter changes
    setSearchParams(next);
  };

  // ---------------------------------------------------------------------------
  // Data hooks
  // ---------------------------------------------------------------------------
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteProducts(filters);

  const { data: categoriesData } = useCategories();

  // Flatten all pages into a single array of products
  const products = data?.pages.flatMap((page) => page.data.products) ?? [];

  // ---- Infinite scroll sentinel ----
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleSentinelIntersection = useCallback(
    (entries: IntersectionObserverEntry[]): void => {
      // <-- return type added
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleSentinelIntersection, {
      rootMargin: '200px',
    });

    observer.observe(sentinel);
    // The cleanup function must have an explicit return type to satisfy ESLint
    return (): void => observer.disconnect();
  }, [handleSentinelIntersection]);

  return (
    <div>
      {/* ---- Breadcrumbs ---- */}
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Products' }]} />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ================================================================ */}
        {/* Sidebar Filters                                                  */}
        {/* ================================================================ */}
        <aside className="w-full lg:w-64 shrink-0 space-y-6">
          {/* ---- Search ---- */}
          <div>
            <h3 className="font-semibold text-sm mb-2 text-neutral-700 dark:text-neutral-300">
              Search
            </h3>
            <Input
              placeholder="Search products…"
              value={search || ''}
              onChange={(e) => updateFilter('search', e.target.value || undefined)}
              data-testid="product-search-input"
            />
          </div>

          {/* ---- Category filter ---- */}
          <div>
            <h3 className="font-semibold text-sm mb-2 text-neutral-700 dark:text-neutral-300">
              Category
            </h3>
            <Select
              value={category || ''}
              onChange={(e) => updateFilter('category', e.target.value || undefined)}
              options={[
                { value: '', label: 'All Categories' },
                ...(categoriesData?.data.categories.map((cat) => ({
                  value: cat.slug,
                  label: cat.name,
                })) ?? []),
              ]}
              data-testid="category-filter-select"
            />
          </div>

          {/* ---- Price range ---- */}
          <div>
            <h3 className="font-semibold text-sm mb-2 text-neutral-700 dark:text-neutral-300">
              Price
            </h3>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={minPrice ?? ''}
                onChange={(e) => updateFilter('minPrice', e.target.value || undefined)}
                data-testid="price-min-input"
              />
              <Input
                type="number"
                placeholder="Max"
                value={maxPrice ?? ''}
                onChange={(e) => updateFilter('maxPrice', e.target.value || undefined)}
                data-testid="price-max-input"
              />
            </div>
          </div>

          {/* ---- Sort order ---- */}
          <div>
            <h3 className="font-semibold text-sm mb-2 text-neutral-700 dark:text-neutral-300">
              Sort by
            </h3>
            <Select
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              options={[
                { value: 'newest', label: 'Newest' },
                { value: 'price_asc', label: 'Price: Low to High' },
                { value: 'price_desc', label: 'Price: High to Low' },
                { value: 'name_asc', label: 'Name: A‑Z' },
                { value: 'name_desc', label: 'Name: Z‑A' },
              ]}
              data-testid="sort-select"
            />
          </div>

          {/* ---- Clear all filters ---- */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setSearchParams({})}
            data-testid="clear-filters-button"
          >
            Clear Filters
          </Button>
        </aside>

        {/* ================================================================ */}
        {/* Product Grid & Infinite Scroll                                   */}
        {/* ================================================================ */}
        <div className="flex-1">
          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <Spinner size="h-8 w-8" />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-error-500 text-center py-12">
              Failed to load products. Please try again.
            </p>
          )}

          {/* Products */}
          {!isLoading && products.length > 0 && (
            <>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Showing {data?.pages[0]?.data.pagination.totalItems ?? 0} product(s)
              </p>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                data-testid="product-grid"
              >
                {products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                    data-testid={`product-card-${product.slug}`}
                  >
                    <Card className="h-full flex flex-col relative">
                      <div className="absolute top-2 right-2 z-10">
                        <WishlistButton
                          product={{
                            id: product.id,
                            name: product.name,
                            slug: product.slug,
                            basePrice: Number(product.basePrice),
                            imageUrl: product.images[0]?.url ?? null,
                          }}
                          compact
                        />
                      </div>
                      {product.images[0] && (
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].altText}
                          className="w-full h-48 object-cover rounded-md mb-3"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://picsum.photos/seed/fallback/400';
                          }}
                        />
                      )}
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                      <p className="text-primary-600 font-bold mt-1">${product.basePrice}</p>
                      {product.averageRating && (
                        <p className="text-sm text-neutral-500 mt-auto">
                          ⭐ {product.averageRating.toFixed(1)} ({product.reviewCount} reviews)
                        </p>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {!isLoading && products.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
            </div>
          )}

          {/* ---- Infinite scroll sentinel & loading indicator ---- */}
          <div ref={sentinelRef} className="h-4" data-testid="infinite-scroll-sentinel" />

          {isFetchingNextPage && (
            <div className="flex justify-center py-6" data-testid="loading-more-spinner">
              <Spinner size="h-6 w-6" />
            </div>
          )}

          {!hasNextPage && products.length > 0 && (
            <p
              className="text-center text-sm text-neutral-400 py-6"
              data-testid="all-products-loaded"
            >
              You've seen all products!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;
