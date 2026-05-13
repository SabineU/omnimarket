// frontend/src/pages/HomePage.tsx
import { useProducts } from '../hooks/useProducts';
import { Card } from '../components/ui';

function HomePage(): React.JSX.Element {
  const { data, isLoading, error } = useProducts(1);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Welcome to OmniMarket</h1>

      {isLoading && <p>Loading products…</p>}
      {error && <p className="text-error-500">Failed to load products.</p>}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.data.products.map((product) => (
            <Card key={product.id}>
              {product.images[0] && (
                <img
                  src={product.images[0].url}
                  alt={product.images[0].altText}
                  className="w-full h-48 object-cover rounded-md mb-3"
                  // If the original image fails to load (e.g., broken URL, network issue),
                  // replace it with a reliable fallback placeholder so the UI never shows a broken image icon.
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/fallback/400';
                  }}
                />
              )}
              <h2 className="text-lg font-semibold">{product.name}</h2>
              <p className="text-primary-600 font-bold mt-1">${product.basePrice}</p>
              {product.averageRating && (
                <p className="text-sm text-neutral-500">
                  ⭐ {product.averageRating.toFixed(1)} ({product.reviewCount} reviews)
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
