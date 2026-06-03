// frontend/src/pages/WishlistPage.tsx
// Displays user's own wishlist (with remove buttons) or a shared wishlist
// (read‑only). A "Copy Wishlist Link" button allows sharing the current
// wishlist via a URL containing the encoded items.
// FIXED: "Create your own wishlist" button now checks auth state.
import { Link, useSearchParams } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { useAuth } from '../hooks/useAuth'; // <-- NEW
import { Card, Button } from '../components/ui';
import toast from 'react-hot-toast';
import type { WishlistItem } from '../contexts/wishlist-context';

function WishlistPage(): React.JSX.Element {
  const { items, count, removeItem } = useWishlist();
  const { user } = useAuth(); // <-- NEW
  const [searchParams] = useSearchParams();

  // ---- Shared wishlist? ----
  const sharedParam = searchParams.get('shared');
  let sharedItems: WishlistItem[] | null = null;
  let isShared = false;
  let sharedError = false;

  if (sharedParam !== null) {
    try {
      const parsed = JSON.parse(sharedParam);
      if (Array.isArray(parsed)) {
        sharedItems = parsed as WishlistItem[];
        isShared = true;
      } else {
        sharedError = true;
      }
    } catch {
      sharedError = true;
    }
  }

  // ---- Generate share link and copy to clipboard ----
  const handleCopyLink = async (): Promise<void> => {
    const sharedData = JSON.stringify(items);
    const shareUrl = `${window.location.origin}/wishlist?shared=${encodeURIComponent(sharedData)}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Wishlist link copied to clipboard!');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Wishlist link copied!');
    }
  };

  // ---- Shared wishlist (valid data) ----
  if (isShared && sharedItems) {
    return (
      <div data-testid="shared-wishlist">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Shared Wishlist</h1>
          {/* FIXED: if logged in, link to own wishlist; otherwise to login */}
          <Link to={user ? '/wishlist' : '/login'}>
            <Button variant="outline">Create your own wishlist</Button>
          </Link>
        </div>
        {sharedItems.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-shared-wishlist">
            <p className="text-lg font-medium text-neutral-700 dark:text-neutral-300">
              This wishlist is empty.
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            data-testid="shared-wishlist-grid"
          >
            {sharedItems.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <Link to={`/products/${item.slug}`}>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-48 object-cover rounded-md mb-3"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://picsum.photos/seed/fallback/400';
                      }}
                    />
                  )}
                  <h3 className="text-lg font-semibold">{item.name}</h3>
                  <p className="text-primary-600 font-bold mt-1">${item.basePrice.toFixed(2)}</p>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- Shared wishlist (invalid data) ----
  if (sharedError) {
    return (
      <div className="text-center py-12" data-testid="invalid-shared-wishlist">
        <p className="text-lg font-medium text-error-500">
          The shared wishlist link is invalid or has expired.
        </p>
        <Link to="/" className="mt-4 inline-block text-primary-600 hover:underline">
          Go to Home
        </Link>
      </div>
    );
  }

  // ---- Own wishlist ----
  return (
    <div data-testid="own-wishlist">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Wishlist</h1>
        {count > 0 && (
          <Button onClick={handleCopyLink} data-testid="copy-wishlist-link-button">
            Copy Wishlist Link
          </Button>
        )}
      </div>

      {count === 0 ? (
        <div className="text-center py-12" data-testid="empty-wishlist">
          <p className="text-lg font-medium text-neutral-700 dark:text-neutral-300">
            Your wishlist is empty
          </p>
          <Link to="/products" className="mt-2 inline-block text-primary-600 hover:underline">
            Browse products
          </Link>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          data-testid="wishlist-grid"
        >
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <Link to={`/products/${item.slug}`}>
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-md mb-3"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://picsum.photos/seed/fallback/400';
                    }}
                  />
                )}
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="text-primary-600 font-bold mt-1">${item.basePrice.toFixed(2)}</p>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => removeItem(item.id)}
                data-testid={`remove-wishlist-${item.id}`}
              >
                Remove
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default WishlistPage;
