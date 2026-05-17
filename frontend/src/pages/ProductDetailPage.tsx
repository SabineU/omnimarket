// frontend/src/pages/ProductDetailPage.tsx
// Product detail page – displays a single product with image gallery,
// description, price, and add-to-cart functionality.
// Now shows feedback (alert for now) when adding to cart succeeds or fails.
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../hooks/useAuth';
import { useCartMutation } from '../hooks/useCartMutation';
import { Button, Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Variation {
  id: string;
  size: string | null;
  color: string | null;
  stockQty: number;
  priceModifier: string | number;
}

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: string | number;
  images: string[];
  sellerId: string;
  sellerName: string;
  categoryName: string;
  variations: Variation[];
}

interface ProductResponse {
  status: string;
  data: {
    product: ProductDetail;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(value: string | number): number {
  return typeof value === 'string' ? parseFloat(value) : value;
}

// ---------------------------------------------------------------------------
// Image component with fallback
// ---------------------------------------------------------------------------

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
}

function ProductImage({ src, alt, className }: ProductImageProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const handleError = useCallback(() => setFailed(true), []);

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
  return <img src={src} alt={alt} className={className} onError={handleError} />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ProductDetailPage(): React.JSX.Element {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const addToCart = useCartMutation();

  // The user can manually select a variation; if none selected,
  // we'll use the first in‑stock one automatically (derived below).
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data, isLoading, error } = useQuery<ProductResponse, Error>({
    queryKey: ['product', productSlug],
    queryFn: async () => {
      const { data } = await apiClient.get<ProductResponse>(`/products/${productSlug}`);
      return data;
    },
    enabled: !!productSlug,
  });

  // Extract product safely
  const product: ProductDetail | undefined =
    data?.data?.product ?? (data as { product?: ProductDetail })?.product;

  // ---- Derived value: effective variation ID ----
  // If the user hasn't picked one, fall back to the first in‑stock variation.
  const effectiveVariationId =
    selectedVariationId ?? product?.variations?.find((v) => v.stockQty > 0)?.id ?? null;

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="h-12 w-12" />
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Error loading product
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">{error.message}</p>
        <Link to="/products">
          <Button className="mt-6">Back to products</Button>
        </Link>
      </div>
    );
  }

  // ---- Not found ----
  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Product not found
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          The product &quot;{productSlug}&quot; could not be found.
        </p>
        <Link to="/products">
          <Button className="mt-6">Browse products</Button>
        </Link>
      </div>
    );
  }

  const handleAddToCart = (): void => {
    if (!user) {
      // Not logged in – redirect to login page, then back here after login
      navigate('/login', { state: { from: `/products/${product.slug}` } });
      return;
    }

    addToCart.mutate(
      {
        productId: product.id,
        variationId: effectiveVariationId,
        quantity,
      },
      {
        onSuccess: () => {
          alert('Item added to cart!');
        },
        onError: (err) => {
          alert(`Failed to add item: ${err.message}`);
          console.error('Add to cart error:', err);
        },
      },
    );
  };

  const basePriceNum = toNumber(product.basePrice);
  const selectedVariation = product.variations.find(
    (v: Variation) => v.id === effectiveVariationId,
  );
  const displayPrice = selectedVariation
    ? basePriceNum + toNumber(selectedVariation.priceModifier)
    : basePriceNum;

  // Button disabled only if user is logged in and there are variations but none is
  // available/selected (shouldn't happen thanks to the fallback, but keep defensive).
  const isAddToCartDisabled = !!(
    user &&
    product.variations.length > 0 &&
    (!effectiveVariationId || (selectedVariation?.stockQty ?? 0) === 0)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8" data-testid="product-detail-page">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        <Link to="/" className="hover:text-primary-600">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-primary-600">
          Products
        </Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900 dark:text-neutral-100">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ---- Image gallery ---- */}
        <div className="space-y-4">
          <div className="aspect-square rounded-xl overflow-hidden">
            <ProductImage
              src={product.images?.[0] ?? ''}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img: string, i: number) => (
                <div key={i} className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                  <ProductImage
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---- Product info ---- */}
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{product.categoryName}</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Sold by{' '}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {product.sellerName}
            </span>
          </p>

          <p className="mt-4 text-3xl font-bold text-primary-600">${displayPrice.toFixed(2)}</p>

          {/* Variations */}
          {product.variations.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Options
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.variations.map((v: Variation) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariationId(v.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      effectiveVariationId === v.id
                        ? 'border-primary-600 bg-primary-50 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                        : 'border-neutral-300 text-neutral-700 hover:border-primary-400 dark:border-neutral-600 dark:text-neutral-300'
                    } ${v.stockQty === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    disabled={v.stockQty === 0}
                    data-testid={`variation-${v.id}`}
                  >
                    {[v.size, v.color].filter(Boolean).join(' / ') || 'Standard'}
                    {v.stockQty === 0 && ' (out of stock)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity and Add to Cart */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center border border-neutral-300 dark:border-neutral-600 rounded-lg">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                data-testid="quantity-decrease"
              >
                −
              </button>
              <span className="px-4 py-2 text-sm font-medium" data-testid="quantity-display">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-2 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                data-testid="quantity-increase"
              >
                +
              </button>
            </div>
            <Button
              onClick={handleAddToCart}
              loading={addToCart.isPending}
              disabled={isAddToCartDisabled}
              data-testid="add-to-cart-button"
            >
              {user ? 'Add to Cart' : 'Sign in to buy'}
            </Button>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Description
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
