// frontend/src/components/CartDrawer.tsx
// A slide‑in cart drawer that displays the user's shopping cart.
// Now with quantity stepper (+/−), remove item button, and
// "View Cart" / "Continue Shopping" links.
// Footer buttons use <Link> styled as a button (no nested <Button>) to ensure
// correct spacing.
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useUpdateCartItem } from '../hooks/useUpdateCartItem';
import { useRemoveCartItem } from '../hooks/useRemoveCartItem';
import { Spinner } from './ui';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function CartDrawer({ isOpen, onClose }: CartDrawerProps): React.JSX.Element | null {
  const { user } = useAuth();
  const { data, isLoading, error } = useCart();

  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();

  if (!isOpen) return null;

  const cartItems = data?.data.items ?? [];
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      aria-modal="true"
      role="dialog"
      aria-label="Shopping cart"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
        data-testid="cart-drawer-backdrop"
      />

      <div
        className="relative w-full max-w-md bg-white dark:bg-neutral-800 shadow-2xl flex flex-col h-full animate-slide-in-right"
        data-testid="cart-drawer"
      >
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Your Cart ({itemCount})
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            aria-label="Close cart"
            data-testid="cart-drawer-close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ---- Content ---- */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!user && (
            <div className="text-center py-8">
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                Sign in to see your cart.
              </p>
              <Link
                to="/login"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 text-white dark:bg-primary-500 dark:hover:bg-primary-600 px-4 py-2 text-sm"
              >
                Sign In
              </Link>
            </div>
          )}

          {user && isLoading && (
            <div className="flex justify-center py-8">
              <Spinner size="h-8 w-8" />
            </div>
          )}

          {user && error && (
            <p className="text-error-500 text-sm text-center">
              Could not load cart. Please try again.
            </p>
          )}

          {user && !isLoading && !error && cartItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">Your cart is empty.</p>
              <Link
                to="/products"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 text-white dark:bg-primary-500 dark:hover:bg-primary-600 px-4 py-2 text-sm"
                data-testid="cart-empty-continue-shopping"
              >
                Continue Shopping
              </Link>
            </div>
          )}

          {user &&
            cartItems.map((item) => {
              const isUpdating = updateCartItem.isPending;
              const isRemoving = removeCartItem.isPending;

              return (
                <div
                  key={item.id}
                  className="flex gap-4 py-3 border-b border-neutral-100 dark:border-neutral-700 last:border-0"
                  data-testid={`cart-item-${item.productId}`}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0">
                    {item.productImage && (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/products/${item.productId}`}
                      onClick={onClose}
                      className="text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:text-primary-600 truncate block"
                    >
                      {item.productName}
                    </Link>

                    <div className="flex items-center gap-1 mt-1">
                      <button
                        type="button"
                        className="h-6 w-6 flex items-center justify-center rounded border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50"
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
                        className="h-6 w-6 flex items-center justify-center rounded border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50"
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

                    <div className="flex items-center justify-between mt-1">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-primary-600">
                          ${item.lineTotal.toFixed(2)}
                        </span>
                        <span className="text-xs text-neutral-400">
                          ${item.price.toFixed(2)} each
                        </span>
                      </div>

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
              );
            })}
        </div>

        {/* ---- Footer (only when items exist) ---- */}
        {user && cartItems.length > 0 && (
          <div className="border-t border-neutral-200 dark:border-neutral-700 px-5 py-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">Subtotal</span>
              <span className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
                ${subtotal.toFixed(2)}
              </span>
            </div>

            {/* "View Cart" – styled as an outlined button */}
            <Link
              to="/cart"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-950 px-5 py-2.5 text-base w-full"
              data-testid="cart-drawer-view-cart"
            >
              View Cart
            </Link>

            {/* "Proceed to Checkout" – styled as a primary button */}
            <Link
              to="/checkout"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 text-white dark:bg-primary-500 dark:hover:bg-primary-600 px-7 py-3 text-lg w-full"
              data-testid="cart-checkout-button"
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default CartDrawer;
