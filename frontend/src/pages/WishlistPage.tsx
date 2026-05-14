// frontend/src/pages/WishlistPage.tsx
// Displays all items the user has saved to their wishlist.
import { Link } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist'; // changed
import { Card, Button } from '../components/ui';

function WishlistPage(): React.JSX.Element {
  const { items, removeItem, count } = useWishlist();

  if (count === 0) {
    return (
      <div className="text-center py-12" data-testid="empty-wishlist">
        <p className="text-lg font-medium text-neutral-700 dark:text-neutral-300">
          Your wishlist is empty
        </p>
        <Link to="/products" className="mt-2 inline-block text-primary-600 hover:underline">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>
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
                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/fallback/400';
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
    </div>
  );
}

export default WishlistPage;
