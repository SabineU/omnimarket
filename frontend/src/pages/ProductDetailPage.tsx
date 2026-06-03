// frontend/src/pages/ProductDetailPage.tsx
// Product detail page – image gallery, description, price, add‑to‑cart,
// related products, customer reviews, recently viewed tracking, SEO tags,
// and seller rating.
// FIXED: strict equality and undefined checks for sellerRating and reviewCount.
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../hooks/useAuth';
import { useCartMutation } from '../hooks/useCartMutation';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useProductReviews } from '../hooks/useProductReviews';
import { Button, Spinner } from '../components/ui';

// ---------------------------------------------------------------------------
// Types – must match the backend's GET /api/products/:slug response
// ---------------------------------------------------------------------------

interface ProductImage {
  id: string;
  url: string;
  altText: string;
  sortOrder: number;
}

interface Variation {
  id: string;
  size: string | null;
  color: string | null;
  stockQty: number;
  priceModifier: string | number;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number | string;
  images: { url: string; altText: string }[];
  averageRating: number | null;
  reviewCount: number;
}

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: string | number;
  images: ProductImage[];
  sellerId: string;
  sellerName: string;
  sellerRating?: number | null;
  sellerReviewCount?: number;
  averageRating?: number | null;
  reviewCount?: number;
  categoryName: string;
  variations: Variation[];
  relatedProducts: RelatedProduct[];
}

interface ProductResponse {
  status: string;
  data: { product: ProductDetail };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(value: string | number): number {
  return typeof value === 'string' ? parseFloat(value) : value;
}

function formatPrice(value: number | string): string {
  const num = toNumber(value);
  return `$${num.toFixed(2)}`;
}

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }): React.JSX.Element {
  const sizeClass = size === 'md' ? 'text-base' : 'text-xs';
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${sizeClass}`}
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'text-yellow-400' : 'text-neutral-300 dark:text-neutral-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
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

  const product: ProductDetail | undefined =
    data?.data?.product ?? (data as { product?: ProductDetail })?.product;

  const { addProduct } = useRecentlyViewed();
  useEffect(() => {
    if (product?.id) addProduct(product.id);
  }, [product?.id, addProduct]);

  const effectiveVariationId =
    selectedVariationId ?? product?.variations?.find((v) => v.stockQty > 0)?.id ?? null;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [reviewPage, setReviewPage] = useState(1);
  const { data: reviewsData, isLoading: reviewsLoading } = useProductReviews(
    product?.id,
    reviewPage,
    5,
  );
  const reviews = reviewsData?.data.reviews ?? [];
  const reviewsPagination = reviewsData?.data.pagination;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="h-12 w-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Error loading product</h1>
        <p className="mt-2">{error.message}</p>
        <Link to="/products">
          <Button className="mt-6">Back to products</Button>
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Product not found</h1>
        <Link to="/products">
          <Button className="mt-6">Browse products</Button>
        </Link>
      </div>
    );
  }

  const productTitle = `${product.name} – OmniMarket`;
  const description =
    product.description.length > 160
      ? `${product.description.slice(0, 157)}...`
      : product.description;
  const imageUrl = product.images?.[0]?.url ?? '/logo.png';
  const currentUrl = window.location.href;

  const handleAddToCart = (): void => {
    if (!user) {
      navigate('/login', { state: { from: `/products/${product.slug}` } });
      return;
    }
    addToCart.mutate({ productId: product.id, variationId: effectiveVariationId, quantity });
  };

  const basePriceNum = toNumber(product.basePrice);
  const selectedVariation = product.variations.find((v) => v.id === effectiveVariationId);
  const displayPrice = selectedVariation
    ? basePriceNum + toNumber(selectedVariation.priceModifier)
    : basePriceNum;
  const isAddToCartDisabled = !!(
    user &&
    product.variations.length > 0 &&
    (!effectiveVariationId || (selectedVariation?.stockQty ?? 0) === 0)
  );

  const safeIndex = Math.min(selectedImageIndex, product.images.length - 1);
  const mainImage = product.images[safeIndex];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8" data-testid="product-detail-page">
      <Helmet>
        <title>{productTitle}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={productTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:image" content={imageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={productTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={imageUrl} />
      </Helmet>

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
        <div className="space-y-4">
          <div className="aspect-square rounded-xl overflow-hidden">
            <ProductImage
              src={mainImage?.url ?? ''}
              alt={mainImage?.altText ?? product.name}
              className="w-full h-full object-cover"
              data-testid="main-product-image"
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <div
                  key={img.id ?? i}
                  className={`w-20 h-20 rounded-lg overflow-hidden shrink-0 border-2 ${i === safeIndex ? 'border-primary-500' : 'border-transparent hover:border-primary-300'}`}
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

        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{product.categoryName}</p>
          <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Sold by{' '}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {product.sellerName}
            </span>
            {/* FIXED: check for null and undefined */}
            {product.sellerRating !== null &&
              product.sellerRating !== undefined &&
              product.sellerRating > 0 && (
                <span
                  className="ml-1 inline-flex items-center gap-0.5"
                  title={`Seller rating: ${product.sellerRating.toFixed(1)} (${product.sellerReviewCount ?? 0} reviews)`}
                  data-testid="seller-rating"
                >
                  ⭐ <span className="font-medium">{product.sellerRating.toFixed(1)}</span>
                </span>
              )}
          </p>
          <p className="mt-4 text-3xl font-bold text-primary-600">${displayPrice.toFixed(2)}</p>

          {product.variations.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Options</h3>
              <div className="flex flex-wrap gap-2">
                {product.variations.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariationId(v.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${effectiveVariationId === v.id ? 'border-primary-600 bg-primary-50 text-primary-600' : 'border-neutral-300'} ${v.stockQty === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={v.stockQty === 0}
                    data-testid={`variation-${v.id}`}
                  >
                    {[v.size, v.color].filter(Boolean).join(' / ') || 'Standard'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center border rounded-lg">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2"
                data-testid="quantity-decrease"
              >
                −
              </button>
              <span className="px-4 py-2" data-testid="quantity-display">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-2"
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
            <h3 className="text-sm font-semibold mb-2">Description</h3>
            <p className="text-sm whitespace-pre-line">{product.description}</p>
          </div>
        </div>
      </div>

      {product.relatedProducts && product.relatedProducts.length > 0 && (
        <section className="mt-16" data-testid="related-products-section">
          <h2 className="text-xl font-bold mb-6">You might also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {product.relatedProducts.map((rp) => (
              <Link
                key={rp.id}
                to={`/products/${rp.slug}`}
                data-testid={`related-product-${rp.slug}`}
              >
                <div className="rounded-xl border p-3 shadow-sm hover:shadow-md h-full flex flex-col">
                  <div className="aspect-square rounded-lg overflow-hidden bg-neutral-100 mb-3">
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
                  <h3 className="text-sm font-medium line-clamp-2 flex-1">{rp.name}</h3>
                  <p className="mt-1 text-sm font-bold text-primary-600">
                    {formatPrice(rp.basePrice)}
                  </p>
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

      <section className="mt-16" data-testid="product-reviews-section">
        <h2 className="text-xl font-bold mb-6">
          Customer Reviews
          {/* FIXED: check for null and undefined */}
          {product.reviewCount !== null &&
            product.reviewCount !== undefined &&
            product.reviewCount > 0 && (
              <span className="ml-2 text-base font-normal text-neutral-500">
                ({product.reviewCount} review{product.reviewCount !== 1 ? 's' : ''})
              </span>
            )}
        </h2>

        {reviewsLoading && (
          <div className="flex justify-center py-8">
            <Spinner size="h-8 w-8" />
          </div>
        )}

        {!reviewsLoading && reviews.length > 0 && (
          <div className="space-y-6" data-testid="reviews-list">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-xl border p-4 dark:border-neutral-700 dark:bg-neutral-800"
                data-testid={`review-${review.id}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium">{review.customer.name}</span>
                  <Stars rating={review.rating} />
                  <span className="text-xs text-neutral-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && <p className="text-sm whitespace-pre-line">{review.comment}</p>}
              </div>
            ))}

            {reviewsPagination && reviewsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm">
                  Page {reviewsPagination.currentPage} of {reviewsPagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reviewsPagination.currentPage === 1}
                    onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                    data-testid="reviews-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reviewsPagination.currentPage === reviewsPagination.totalPages}
                    onClick={() => setReviewPage((p) => p + 1)}
                    data-testid="reviews-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {!reviewsLoading && reviews.length === 0 && (
          <p className="text-neutral-500 text-center py-8">
            There are no reviews yet. Be the first to review this product!
          </p>
        )}
      </section>
    </div>
  );
}

export default ProductDetailPage;
