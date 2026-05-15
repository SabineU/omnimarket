// frontend/src/components/CartDrawer.tsx
// A slide‑in cart drawer that displays the user's shopping cart.
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { Button, Spinner } from './ui';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function CartDrawer({ isOpen, onClose }: CartDrawerProps): React.JSX.Element | null {
  const { user } = useAuth();
  const { data, isLoading, error } = useCart();

  // Don't render anything if the drawer is closed
  if (!isOpen) return null;

  // Calculate subtotal from cart items
  const cartItems = data?.data.items ?? [];
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    // Full‑screen overlay (click to close)
    <div
      className="fixed inset-0 z-50 flex justify-end"
      aria-modal="true"
      role="dialog"
      aria-label="Shopping cart"
    >
      {/* Semi‑transparent backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
        data-testid="cart-drawer-backdrop"
      />

      {/* Drawer panel – slides in from the right */}
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
            {/* X icon */}
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
          {/* Not logged in */}
          {!user && (
            <div className="text-center py-8">
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                Sign in to see your cart.
              </p>
              <Link to="/login" onClick={onClose}>
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          )}

          {/* Loading */}
          {user && isLoading && (
            <div className="flex justify-center py-8">
              <Spinner size="h-8 w-8" />
            </div>
          )}

          {/* Error */}
          {user && error && (
            <p className="text-error-500 text-sm text-center">
              Could not load cart. Please try again.
            </p>
          )}

          {/* Empty cart */}
          {user && !isLoading && cartItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-neutral-500 dark:text-neutral-400">Your cart is empty.</p>
            </div>
          )}

          {/* Cart items */}
          {user &&
            cartItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 py-3 border-b border-neutral-100 dark:border-neutral-700 last:border-0"
                data-testid={`cart-item-${item.productId}`}
              >
                {/* Product image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 shrink-0">
                  {item.productImage && (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/products/${item.productId}`}
                    onClick={onClose}
                    className="text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:text-primary-600 truncate block"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Qty: {item.quantity}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-semibold text-primary-600">
                      ${item.lineTotal.toFixed(2)}
                    </span>
                    <span className="text-xs text-neutral-400">${item.price.toFixed(2)} each</span>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* ---- Footer (subtotal + checkout) ---- */}
        {user && cartItems.length > 0 && (
          <div className="border-t border-neutral-200 dark:border-neutral-700 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">Subtotal</span>
              <span className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <Link to="/checkout" onClick={onClose}>
              <Button className="w-full" size="lg" data-testid="cart-checkout-button">
                Proceed to Checkout
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default CartDrawer;
