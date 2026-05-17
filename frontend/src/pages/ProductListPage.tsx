// frontend/src/pages/ProductListPage.tsx
// Product listing page with search, filter, and sort controls.
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { Spinner } from '../components/ui';

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: string | number;
  images: string[];
  sellerName: string;
  categoryName?: string;
}

interface ProductsResponse {
  status: string;
  data: {
    items: Product[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    };
  };
}

function toNumber(price: string | number): number {
  return typeof price === 'string' ? parseFloat(price) : price;
}

// Simple image component with fallback
function ProductImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-200 dark:bg-neutral-700 text-neutral-400 ${className ?? ''}`}
      >
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

function ProductListPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const sort = searchParams.get('sort') ?? 'relevance';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const [searchInput, setSearchInput] = useState(search);

  const { data, isLoading, error } = useQuery<ProductsResponse, Error>({
    queryKey: ['products', { search, category, sort, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (sort) params.set('sort', sort);
      params.set('page', String(page));
      params.set('limit', '12');
      const response = await apiClient.get<ProductsResponse>(`/products?${params.toString()}`);
      return response.data;
    },
  });

  // Extract products with type‑safe checks (no `any`)
  const rawData: unknown = data;
  let products: Product[] = [];

  if (typeof rawData === 'object' && rawData !== null) {
    const obj = rawData as Record<string, unknown>;

    const tryExtract = (candidate: unknown): void => {
      if (Array.isArray(candidate)) {
        products = candidate as Product[];
      }
    };

    tryExtract(obj.data);
    tryExtract(obj.items);
    if (!products.length && obj.data && typeof obj.data === 'object') {
      const dataObj = obj.data as Record<string, unknown>;
      tryExtract(dataObj.items);
      tryExtract(dataObj.products);
    }
  }

  const applyFilters = (): void => {
    const params = new URLSearchParams();
    if (searchInput) params.set('search', searchInput);
    if (category) params.set('category', category);
    if (sort !== 'relevance') params.set('sort', sort);
    setSearchParams(params);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8" data-testid="product-list-page">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
        {category ? `Category: ${category}` : 'All Products'}
      </h1>

      <div className="flex gap-4 mb-8 flex-wrap">
        <input
          type="text"
          placeholder="Search products…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
          data-testid="product-search-input"
        />
        <button
          onClick={applyFilters}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
          data-testid="apply-filters-button"
        >
          Search
        </button>
        {category && (
          <Link
            to="/products"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Clear category
          </Link>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="h-10 w-10" />
        </div>
      )}
      {error && (
        <p className="text-error-500 text-center">Failed to load products: {error.message}</p>
      )}

      {!isLoading && !error && (
        <>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product: Product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.slug}`}
                  className="block rounded-xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden"
                  data-testid={`product-card-${product.id}`}
                >
                  <div className="aspect-square">
                    <ProductImage
                      src={product.images?.[0] ?? ''}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {product.name}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {product.sellerName}
                    </p>
                    <p className="mt-2 text-lg font-bold text-primary-600">
                      ${toNumber(product.basePrice).toFixed(2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-neutral-500 dark:text-neutral-400">No products found.</p>
              {category && (
                <Link to="/products" className="mt-4 inline-block text-primary-600 hover:underline">
                  Browse all products
                </Link>
              )}
              {/* Debug: show raw response when empty */}
              <details className="mt-6 text-left text-xs text-neutral-400 dark:text-neutral-600 max-w-lg mx-auto">
                <summary className="cursor-pointer hover:text-neutral-500">
                  Debug: API response
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProductListPage;
