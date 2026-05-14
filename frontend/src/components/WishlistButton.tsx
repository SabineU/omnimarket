// frontend/src/components/WishlistButton.tsx
// A heart‑shaped button that toggles a product in the wishlist.
import { useWishlist } from '../hooks/useWishlist'; // changed
import type { WishlistItem } from '../contexts/wishlist-context'; // changed

interface WishlistButtonProps {
  product: WishlistItem;
  compact?: boolean;
}

function WishlistButton({ product, compact = true }: WishlistButtonProps): React.JSX.Element {
  const { isInWishlist, addItem, removeItem } = useWishlist();
  const active = isInWishlist(product.id);

  const handleClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (active) {
      removeItem(product.id);
    } else {
      addItem(product);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={`p-1.5 rounded-full transition-colors ${
          active
            ? 'text-error-500 hover:bg-error-100 dark:hover:bg-error-900'
            : 'text-neutral-400 hover:text-error-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'
        }`}
        aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
        data-testid={`wishlist-button-${product.id}`}
      >
        <svg
          className="h-5 w-5"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
        active
          ? 'border-error-300 bg-error-50 text-error-700 hover:bg-error-100 dark:bg-error-900 dark:text-error-300'
          : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800'
      }`}
      data-testid={`wishlist-button-${product.id}`}
    >
      <svg
        className="h-5 w-5"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {active ? 'Saved' : 'Save'}
    </button>
  );
}

export default WishlistButton;
