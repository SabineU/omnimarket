// frontend/src/pages/ProductDetailPage.tsx
// Product detail page – displays image gallery, variations, price,
// and an "Add to Cart" button.
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useProduct } from '../hooks/useProduct';
import { useAddToCart } from '../hooks/useCartMutation';
import { useAuth } from '../hooks/useAuth';
import { Button, Input, Spinner, Breadcrumbs } from '../components/ui';

function ProductDetailPage(): React.JSX.Element {
  // ---- All hooks are called unconditionally at the top ----
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const addToCart = useAddToCart();

  // Fetch the product – React Query will skip the API call when slug is undefined
  const { data, isLoading, error } = useProduct(slug ?? '');

  // Local state
  const [selectedVariationId, setSelectedVariationId] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // ---- Handle missing slug ----
  if (!slug) {
    return (
      <div className="text-center py-12 text-error-500">
        <p className="text-lg font-medium">Invalid product URL</p>
        <Link to="/products" className="text-primary-600 underline mt-2 inline-block">
          Back to products
        </Link>
      </div>
    );
  }

  // ---- Handle adding to cart ----
  const handleAddToCart = async (): Promise<void> => {
    if (!data) return;
    try {
      await addToCart.mutateAsync({
        productId: data.data.product.id,
        variationId: selectedVariationId,
        quantity,
      });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch {
      // Error is handled by the mutation state
    }
  };

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="h-8 w-8" />
      </div>
    );
  }

  // ---- Error or missing data ----
  if (error || !data) {
    return (
      <div className="text-center py-12 text-error-500">
        <p className="text-lg font-medium">Product not found</p>
        <Link to="/products" className="text-primary-600 underline mt-2 inline-block">
          Back to products
        </Link>
      </div>
    );
  }

  const product = data.data.product;

  // Convert string prices to numbers (Prisma Decimal → string)
  const basePrice = Number(product.basePrice);
  const selectedVariation = product.variations.find((v) => v.id === selectedVariationId);
  const priceModifier = selectedVariation ? Number(selectedVariation.priceModifier) : 0;
  const currentPrice = basePrice + priceModifier;

  // The currently displayed image (defaults to first image)
  const mainImage = product.images[selectedImageIndex] ?? product.images[0];

  return (
    <div>
      {/* ---- Breadcrumbs ---- */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Products', href: '/products' },
          { label: product.name },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ================================================================ */}
        {/* Left: Image Gallery                                              */}
        {/* ================================================================ */}
        <div>
          {/* Main image */}
          <div
            className="aspect-square rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 mb-4"
            data-testid="product-main-image"
          >
            <img
              src={mainImage?.url ?? 'https://picsum.photos/seed/fallback/600'}
              alt={mainImage?.altText ?? product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/fallback/600';
              }}
            />
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto" data-testid="product-thumbnails">
              {product.images.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(index)}
                  data-testid={`product-thumbnail-${index}`}
                  className={`w-20 h-20 rounded-lg border-2 overflow-hidden shrink-0 transition-colors ${
                    index === selectedImageIndex
                      ? 'border-primary-500'
                      : 'border-transparent hover:border-primary-300'
                  }`}
                >
                  <img src={img.url} alt={img.altText} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* Right: Product Info & Purchase                                   */}
        {/* ================================================================ */}
        <div>
          {/* Product name & brand */}
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            {product.name}
          </h1>
          {product.brand && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Brand: {product.brand}
            </p>
          )}

          {/* Seller info */}
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Sold by{' '}
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {product.seller.storeName}
            </span>
          </p>

          {/* Rating */}
          {product.averageRating && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-yellow-500 text-lg">
                {'★'.repeat(Math.round(product.averageRating))}
                {'☆'.repeat(5 - Math.round(product.averageRating))}
              </span>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {product.averageRating.toFixed(1)} ({product.reviewCount} reviews)
              </span>
            </div>
          )}

          {/* Price */}
          <p className="text-2xl font-bold text-primary-600 mt-4">${currentPrice.toFixed(2)}</p>

          {/* Description */}
          <p className="text-neutral-700 dark:text-neutral-300 mt-4 leading-relaxed">
            {product.description}
          </p>

          {/* ---- Variation Selector ---- */}
          {product.variations.length > 0 && (
            <div className="mt-6 space-y-4">
              {/* Size selector */}
              {product.variations.some((v) => v.size) && (
                <div data-testid="size-selector">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Size
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variations
                      .filter((v) => v.size)
                      .map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariationId(v.id)}
                          data-testid={`size-option-${v.size}`}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            selectedVariationId === v.id
                              ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                              : 'border-neutral-300 dark:border-neutral-600 hover:border-primary-400'
                          }`}
                        >
                          {v.size}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Color selector */}
              {product.variations.some((v) => v.color) && (
                <div data-testid="color-selector">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variations
                      .filter((v) => v.color)
                      .map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariationId(v.id)}
                          data-testid={`color-option-${v.color}`}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            selectedVariationId === v.id
                              ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                              : 'border-neutral-300 dark:border-neutral-600 hover:border-primary-400'
                          }`}
                        >
                          {v.color}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- Quantity & Add to Cart ---- */}
          <div className="mt-6 flex items-center gap-4">
            <div className="w-24">
              <Input
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                label="Qty"
                data-testid="product-quantity-input"
              />
            </div>

            {user ? (
              <Button
                onClick={handleAddToCart}
                loading={addToCart.isPending}
                className="flex-1"
                size="lg"
                data-testid="add-to-cart-button"
              >
                {addedToCart ? '✓ Added!' : 'Add to Cart'}
              </Button>
            ) : (
              <Link to="/login" className="flex-1" data-testid="login-to-add-to-cart-link">
                <Button variant="outline" className="w-full" size="lg">
                  Login to Add to Cart
                </Button>
              </Link>
            )}
          </div>

          {/* ---- Error from cart mutation ---- */}
          {addToCart.isError && (
            <p className="text-error-500 text-sm mt-2">
              {isAxiosError(addToCart.error) && addToCart.error.response?.data?.message
                ? addToCart.error.response.data.message
                : 'Could not add to cart. Please try again.'}
            </p>
          )}

          {/* ---- Success feedback ---- */}
          {addedToCart && !addToCart.isError && (
            <p className="text-success-600 text-sm mt-2">Item added to cart successfully!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
