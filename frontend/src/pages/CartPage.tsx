// frontend/src/pages/CartPage.tsx
// Full cart page: items grouped by seller, quantity controls,
// coupon validation, and checkout button.
// Now uses toast for coupon feedback.
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast'; // <-- added
import { useCart, type CartItem } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useUpdateCartItem } from '../hooks/useUpdateCartItem';
import { useRemoveCartItem } from '../hooks/useRemoveCartItem';
import { useValidateCoupon, type ValidCoupon } from '../hooks/useValidateCoupon';
import { Button, Spinner } from '../components/ui';
import CouponInput from '../components/CouponInput';

/**
 * CartPage renders the user's shopping cart.
 *
 * It handles three states:
 * - Loading: spinner while the cart is being fetched.
 * - Empty: a friendly message with a link to continue shopping.
 * - Populated: items grouped by seller, quantity controls, coupon input,
 *   and order summary.
 */
function CartPage(): React.JSX.Element {
  // ---------------------------------------------------------------------------
  // Data & State
  // ---------------------------------------------------------------------------
  const { user } = useAuth();
  const { data, isLoading, error } = useCart();
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const validateCoupon = useValidateCoupon();
  const [appliedCoupon, setAppliedCoupon] = useState<ValidCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Derived Values
  // ---------------------------------------------------------------------------
  const cartItems: CartItem[] = useMemo(() => data?.data.items ?? [], [data?.data.items]);

  const sellerGroups = useMemo(() => {
    const groups = new Map<string, { sellerName: string; items: CartItem[]; subtotal: number }>();
    for (const item of cartItems) {
      let group = groups.get(item.sellerId);
      if (!group) {
        group = { sellerName: item.sellerName, items: [], subtotal: 0 };
        groups.set(item.sellerId, group);
      }
      group.items.push(item);
      group.subtotal += item.lineTotal;
    }
    return groups;
  }, [cartItems]);

  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [cartItems],
  );

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.minCartAmount !== null && cartSubtotal < appliedCoupon.minCartAmount) {
      return 0;
    }
    if (appliedCoupon.discountType === 'PERCENTAGE') {
      return (cartSubtotal * appliedCoupon.discountValue) / 100;
    } else {
      return Math.min(appliedCoupon.discountValue, cartSubtotal);
    }
  }, [cartSubtotal, appliedCoupon]);

  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  const totalItemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleIncrease = (itemId: string, currentQty: number): void => {
    updateCartItem.mutate({ itemId, quantity: currentQty + 1 });
  };

  const handleDecrease = (itemId: string, currentQty: number): void => {
    if (currentQty <= 1) return;
    updateCartItem.mutate({ itemId, quantity: currentQty - 1 });
  };

  const handleRemove = (itemId: string): void => {
    removeCartItem.mutate({ itemId });
  };

  const handleApplyCoupon = (code: string): void => {
    setCouponError(null);
    validateCoupon.mutate(
      { code },
      {
        onSuccess: (coupon) => {
          setAppliedCoupon(coupon);
          toast.success(`Coupon "${code}" applied!`);
        },
        onError: (err) => {
          setCouponError(err.message);
          toast.error(err.message);
        },
      },
    );
  };

  const handleRemoveCoupon = (): void => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // ---------------------------------------------------------------------------
  // Render: Loading State
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="h-12 w-12" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Error State
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-error-500">Could not load your cart. Please try again later.</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Not Logged In
  // ---------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Shopping Cart</h1>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">
          Please sign in to view your cart.
        </p>
        <Link to="/login">
          <Button className="mt-4" size="lg">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Empty Cart
  // ---------------------------------------------------------------------------
  if (cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <svg
          className="mx-auto h-16 w-16 text-neutral-300 dark:text-neutral-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
          />
        </svg>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Your cart is empty
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Looks like you haven&apos;t added anything to your cart yet.
        </p>
        <Link to="/products">
          <Button className="mt-6" size="lg">
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Populated Cart
  // ---------------------------------------------------------------------------
  const sellerGroupArray = Array.from(sellerGroups.entries());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8" data-testid="cart-page">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        Shopping Cart ({totalItemCount})
      </h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* ---- Left column: cart items grouped by seller ---- */}
        <div className="lg:col-span-2 space-y-8" data-testid="cart-items-list">
          {sellerGroupArray.map(([sellerId, group]) => (
            <div
              key={sellerId}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
              data-testid={`cart-seller-group-${sellerId}`}
            >
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-700">
                <svg
                  className="h-5 w-5 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Sold by{' '}
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {group.sellerName}
                  </span>
                </span>
              </div>

              <ul className="space-y-4">
                {group.items.map((item) => {
                  const isUpdating = updateCartItem.isPending;
                  const isRemoving = removeCartItem.isPending;

                  return (
                    <li
                      key={item.id}
                      className="flex gap-4"
                      data-testid={`cart-item-${item.productId}`}
                    >
                      <Link
                        to={`/products/${item.productId}`}
                        className="w-20 h-20 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700 shrink-0"
                      >
                        {item.productImage && (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/products/${item.productId}`}
                          className="text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:text-primary-600 line-clamp-1"
                        >
                          {item.productName}
                        </Link>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          ${item.price.toFixed(2)} each
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="h-7 w-7 flex items-center justify-center rounded border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50"
                              onClick={() => handleDecrease(item.id, item.quantity)}
                              disabled={isUpdating || isRemoving || item.quantity <= 1}
                              aria-label={`Decrease quantity of ${item.productName}`}
                              data-testid={`cart-item-decrease-${item.productId}`}
                            >
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M20 12H4"
                                />
                              </svg>
                            </button>
                            <span
                              className="inline-flex items-center justify-center w-8 text-sm font-medium text-neutral-900 dark:text-neutral-100"
                              data-testid={`cart-item-quantity-${item.productId}`}
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="h-7 w-7 flex items-center justify-center rounded border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50"
                              onClick={() => handleIncrease(item.id, item.quantity)}
                              disabled={isUpdating || isRemoving}
                              aria-label={`Increase quantity of ${item.productName}`}
                              data-testid={`cart-item-increase-${item.productId}`}
                            >
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-primary-600">
                              ${item.lineTotal.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              className="text-neutral-400 hover:text-error-500 transition-colors disabled:opacity-50"
                              onClick={() => handleRemove(item.id)}
                              disabled={isRemoving || isUpdating}
                              aria-label={`Remove ${item.productName} from cart`}
                              data-testid={`cart-item-remove-${item.productId}`}
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700 text-right">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  Seller subtotal:{' '}
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    ${group.subtotal.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ---- Right column: coupon + order summary ---- */}
        <div className="space-y-6" data-testid="cart-summary">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
              Coupon Code
            </h3>
            <CouponInput
              onApply={handleApplyCoupon}
              onRemove={handleRemoveCoupon}
              appliedCoupon={appliedCoupon}
              isLoading={validateCoupon.isPending}
              error={couponError}
            />
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
              Order Summary
            </h3>

            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-neutral-600 dark:text-neutral-400">
                Subtotal ({totalItemCount} items)
              </span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                ${cartSubtotal.toFixed(2)}
              </span>
            </div>

            {appliedCoupon && (
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  Discount ({appliedCoupon.code})
                </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  −${discountAmount.toFixed(2)}
                </span>
              </div>
            )}

            <hr className="my-3 border-neutral-200 dark:border-neutral-700" />

            <div className="flex items-center justify-between text-base font-bold mb-4">
              <span className="text-neutral-900 dark:text-neutral-100">Total</span>
              <span className="text-neutral-900 dark:text-neutral-100">
                ${cartTotal.toFixed(2)}
              </span>
            </div>

            <Link to="/checkout">
              <Button className="w-full" size="lg" data-testid="cart-checkout-button">
                Proceed to Checkout
              </Button>
            </Link>

            <Link
              to="/products"
              className="block mt-3 text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;
