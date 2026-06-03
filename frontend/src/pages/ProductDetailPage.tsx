// frontend/src/pages/ProductDetailPage.tsx
// Product detail page – displays a single product with image gallery,
// description, price, add‑to‑cart, and related products.
// FIXED: clicking a thumbnail now switches the main image.
// NEW: related products section at the bottom.
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../hooks/useAuth';
import { useCartMutation } from '../hooks/useCartMutation';
import { Button, Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// Types – must match the backend's GET /api/products/:slug response
// ---------------------------------------------------------------------------

/** A single product image returned by the API */
interface ProductImage {
  id: string;
  url: string;
  altText: string;
  sortOrder: number;
}

/** A product variation (size/colour) */
interface Variation {
  id: string;
  size: string | null;
  color: string | null;
  stockQty: number;
  priceModifier: string | number;
}

/** A lightweight product for the "Related Products" section */
interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number | string; // Decimal can be string
  images: { url: string; altText: string }[];
  averageRating: number | null;
  reviewCount: number;
}

/** Full product detail shape */
interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: string | number;
  images: ProductImage[]; // main gallery images
  sellerId: string;
  sellerName: string;
  categoryName: string;
  variations: Variation[];
  relatedProducts: RelatedProduct[]; // NEW: related items from the same category
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

/** Safely convert a price (string or number) to a number */
function toNumber(value: string | number): number {
  return typeof value === 'string' ? parseFloat(value) : value;
}

/** Format a price for display */
function formatPrice(value: number | string): string {
  const num = toNumber(value);
  return `$${num.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Image component with fallback placeholder
// ---------------------------------------------------------------------------
interface ProductImageProps {
  src: string; // image URL
  alt: string; // alt text
  className?: string;
  onClick?: () => void; // optional click handler (for thumbnails)
  'data-testid'?: string;
}

function ProductImage({
  src,
  alt,
  className,
  onClick,
  'data-testid': dataTestId,
}: ProductImageProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const handleError = useCallback(() => setFailed(true), []);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-200 dark:bg-neutral-700 text-neutral-400 ${className ?? ''}`}
        data-testid={dataTestId}
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

  return (
    <img
      src={src}
      alt={alt}
      className={`${className ?? ''} ${onClick ? 'cursor-pointer' : ''}`}
      onError={handleError}
      onClick={onClick}
      data-testid={dataTestId}
    />
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
function ProductDetailPage(): React.JSX.Element {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const addToCart = useCartMutation();

  // Variation selection and quantity
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // ---- Fetch product by slug ----
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

  // ---- Derived value: effective variation ----
  const effectiveVariationId =
    selectedVariationId ?? product?.variations?.find((v) => v.stockQty > 0)?.id ?? null;

  // ---- Image gallery state ----
  // Track which image index is currently displayed as the main image.
  // Defaults to 0 (the first image).
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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

  // ---- Add to cart handler ----
  const handleAddToCart = (): void => {
    if (!user) {
      navigate('/login', { state: { from: `/products/${product.slug}` } });
      return;
    }

    addToCart.mutate({
      productId: product.id,
      variationId: effectiveVariationId,
      quantity,
    });
  };

  // ---- Price calculation ----
  const basePriceNum = toNumber(product.basePrice);
  const selectedVariation = product.variations.find(
    (v: Variation) => v.id === effectiveVariationId,
  );
  const displayPrice = selectedVariation
    ? basePriceNum + toNumber(selectedVariation.priceModifier)
    : basePriceNum;

  // Disable "Add to Cart" if no in‑stock variation is selected
  const isAddToCartDisabled = !!(
    user &&
    product.variations.length > 0 &&
    (!effectiveVariationId || (selectedVariation?.stockQty ?? 0) === 0)
  );

  // Clamp selectedImageIndex to valid range in case the product has fewer images than expected
  const safeIndex = Math.min(selectedImageIndex, product.images.length - 1);
  const mainImage = product.images[safeIndex];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8" data-testid="product-detail-page">
      {/* ---- Breadcrumb ---- */}
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
          {/* Main image – displays the currently selected image */}
          <div className="aspect-square rounded-xl overflow-hidden">
            <ProductImage
              src={mainImage?.url ?? ''}
              alt={mainImage?.altText ?? product.name}
              className="w-full h-full object-cover"
              data-testid="main-product-image"
            />
          </div>

          {/* Thumbnail gallery – clicking a thumbnail updates the main image */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img: ProductImage, i: number) => (
                <div
                  key={img.id ?? i}
                  className={`w-20 h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                    i === safeIndex
                      ? 'border-primary-500'
                      : 'border-transparent hover:border-primary-300'
                  }`}
                >
                  <ProductImage
                    src={img.url}
                    alt={img.altText ?? `${product.name} ${i + 1}`}
                    className="w-full h-full object-cover"
                    onClick={() => setSelectedImageIndex(i)}
                    data-testid={`thumbnail-${i}`}
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

          {/* Description */}
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

      {/* ==================================================================
           RELATED PRODUCTS – "You might also like"
           ================================================================== */}
      {product.relatedProducts && product.relatedProducts.length > 0 && (
        <section className="mt-16" data-testid="related-products-section">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
            You might also like
          </h2>
          {/* Responsive grid: 2 columns on phone, 3 on tablet, 4 on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {product.relatedProducts.map((rp) => (
              <Link
                key={rp.id}
                to={`/products/${rp.slug}`}
                className="group"
                data-testid={`related-product-${rp.slug}`}
              >
                <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow dark:border-neutral-700 dark:bg-neutral-800 h-full flex flex-col">
                  {/* Image */}
                  <div className="aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700 mb-3">
                    {rp.images[0] ? (
                      <ProductImage
                        src={rp.images[0].url}
                        alt={rp.images[0].altText ?? rp.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <svg
                          className="h-10 w-10"
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
                  {/* Name */}
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2 flex-1">
                    {rp.name}
                  </h3>
                  {/* Price */}
                  <p className="mt-1 text-sm font-bold text-primary-600">
                    {formatPrice(rp.basePrice)}
                  </p>
                  {/* Rating (if any) */}
                  {rp.averageRating !== null && (
                    <p className="text-xs text-neutral-500 mt-1">
                      ⭐ {rp.averageRating.toFixed(1)} ({rp.reviewCount})
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default ProductDetailPage;
