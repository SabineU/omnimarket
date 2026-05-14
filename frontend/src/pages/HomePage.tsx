// frontend/src/pages/HomePage.tsx
// OmniMarket homepage – hero, category cards, and featured products.
import { Link } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useFeaturedProducts } from '../hooks/useFeaturedProducts';
import { Card, Button, Spinner } from '../components/ui';

function HomePage(): React.JSX.Element {
  const { data: catData, isLoading: catLoading, error: catError } = useCategories();

  const {
    data: featuredData,
    isLoading: featuredLoading,
    error: featuredError,
  } = useFeaturedProducts();

  return (
    <div>
      {/* ================================================================ */}
      {/* Hero Section                                                      */}
      {/* ================================================================ */}
      <section
        className="relative bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-2xl overflow-hidden mb-12"
        data-testid="hero-section"
      >
        <div className="px-8 py-16 md:py-24 text-center">
          <h1
            className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4"
            data-testid="hero-title"
          >
            Many worlds, one place.
          </h1>
          <p className="text-lg md:text-xl text-primary-100 max-w-2xl mx-auto mb-8">
            Discover millions of products from thousands of sellers — all in one marketplace.
          </p>
          <Link to="/products" data-testid="shop-now-link">
            <Button
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-primary-700 !px-8"
            >
              Shop Now
            </Button>
          </Link>
        </div>
      </section>

      {/* ================================================================ */}
      {/* Category Cards                                                    */}
      {/* ================================================================ */}
      <section className="mb-12" data-testid="category-section">
        <h2 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-neutral-100">
          Shop by Category
        </h2>

        {catLoading && (
          <div className="flex justify-center py-8">
            <Spinner size="h-8 w-8" />
          </div>
        )}
        {catError && <p className="text-error-500">Failed to load categories.</p>}

        {catData && catData.data.categories.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {catData.data.categories.slice(0, 12).map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="group"
                data-testid={`category-card-${cat.slug}`}
              >
                <Card className="h-full flex flex-col items-center justify-center text-center p-4 transition-shadow hover:shadow-lg cursor-pointer">
                  {/* Placeholder icon – could be an image later */}
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center mb-3">
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      {cat.name.charAt(0)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-primary-600 transition-colors">
                    {cat.name}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {catData && catData.data.categories.length === 0 && (
          <p className="text-neutral-500">No categories yet.</p>
        )}
      </section>

      {/* ================================================================ */}
      {/* Featured Products                                                 */}
      {/* ================================================================ */}
      <section data-testid="featured-section">
        <h2 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-neutral-100">
          Featured Products
        </h2>

        {featuredLoading && (
          <div className="flex justify-center py-8">
            <Spinner size="h-8 w-8" />
          </div>
        )}
        {featuredError && <p className="text-error-500">Failed to load featured products.</p>}

        {featuredData && featuredData.data.products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredData.data.products.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.slug}`}
                data-testid={`featured-product-${product.slug}`}
              >
                <Card className="h-full flex flex-col">
                  {product.images[0] && (
                    <img
                      src={product.images[0].url}
                      alt={product.images[0].altText}
                      className="w-full h-48 object-cover rounded-md mb-3"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://picsum.photos/seed/fallback/400';
                      }}
                    />
                  )}
                  <h3 className="text-lg font-semibold">{product.name}</h3>
                  <p className="text-primary-600 font-bold mt-1">${product.basePrice}</p>
                  {product.averageRating && (
                    <p className="text-sm text-neutral-500 mt-auto">
                      ⭐ {product.averageRating.toFixed(1)} ({product.reviewCount} reviews)
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}

        {featuredData && featuredData.data.products.length === 0 && (
          <p className="text-neutral-500">No featured products right now.</p>
        )}
      </section>
    </div>
  );
}

export default HomePage;
