// frontend/src/pages/HomePage.tsx
// OmniMarket homepage – hero, category cards, category‑focused product
// sections (inspired by Amazon's layout), and a Recently Viewed strip.
import { Link } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useHomepageSections, type HomepageSection } from '../hooks/useHomepageSections';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'; // <-- NEW
import RecentlyViewedStrip from '../components/RecentlyViewedStrip'; // <-- NEW
import { Card, Button, Spinner } from '../components/ui';
import WishlistButton from '../components/WishlistButton';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely convert a price (string or number) to a number for display */
function toPrice(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isNaN(num) ? '0.00' : num.toFixed(2);
}

// ---------------------------------------------------------------------------
// Sub‑component: a single product card used inside a category section
// ---------------------------------------------------------------------------
interface SectionProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number | string;
    images: { url: string; altText: string }[];
    averageRating: number | null;
    reviewCount: number;
  };
}

function SectionProductCard({ product }: SectionProductCardProps): React.JSX.Element {
  const imageUrl = product.images?.[0]?.url ?? '';
  const imageAlt = product.images?.[0]?.altText ?? product.name;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group"
      data-testid={`section-product-${product.slug}`}
    >
      <Card className="h-full flex flex-col relative">
        {/* Wishlist button */}
        <div className="absolute top-2 right-2 z-10">
          <WishlistButton
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              basePrice: Number(product.basePrice),
              imageUrl: imageUrl || null,
            }}
            compact
          />
        </div>

        {/* Product image */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt}
            className="w-full h-48 object-cover rounded-md mb-3"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/fallback/400';
            }}
          />
        ) : (
          <div className="w-full h-48 bg-neutral-200 dark:bg-neutral-700 rounded-md mb-3 flex items-center justify-center text-neutral-400">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Name, price, rating */}
        <h3 className="text-sm font-semibold line-clamp-2">{product.name}</h3>
        <p className="text-primary-600 font-bold mt-1">${toPrice(product.basePrice)}</p>
        {product.averageRating !== null && (
          <p className="text-sm text-neutral-500 mt-auto">
            ⭐ {product.averageRating.toFixed(1)} ({product.reviewCount} reviews)
          </p>
        )}
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Sub‑component: a single category section (title + product grid + see more)
// ---------------------------------------------------------------------------
interface CategorySectionProps {
  section: HomepageSection;
}

function CategorySection({ section }: CategorySectionProps): React.JSX.Element {
  if (section.products.length === 0) return <></>; // nothing to show

  return (
    <section className="mb-12" data-testid={`section-${section.categorySlug}`}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          {section.categoryName}
        </h2>
        <Link
          to={`/products?category=${section.categorySlug}`}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
          data-testid={`see-more-${section.categorySlug}`}
        >
          See more
        </Link>
      </div>

      {/* Product grid – 4 columns on desktop, 2 on tablet, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {section.products.map((product) => (
          <SectionProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main homepage component
// ---------------------------------------------------------------------------
function HomePage(): React.JSX.Element {
  // Existing category cards data
  const { data: catData, isLoading: catLoading, error: catError } = useCategories();

  // Homepage category sections (Electronics, Fashion, Home & Garden, etc.)
  const { sections, isLoading: sectionsLoading, error: sectionsError } = useHomepageSections(4);

  // Recently viewed product IDs (for the strip at the bottom)
  const { ids: recentIds } = useRecentlyViewed();

  // Combined loading / error states
  const isLoading = catLoading || sectionsLoading;
  const error = catError ?? sectionsError;

  return (
    <div>
      {/* ================================================================ */}
      {/* Hero Section (unchanged)                                         */}
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
      {/* Category Cards (unchanged)                                        */}
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
      {/* Category Product Sections (replaces old Featured Products)       */}
      {/* ================================================================ */}
      <div data-testid="homepage-sections">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Spinner size="h-8 w-8" />
          </div>
        )}

        {error && <p className="text-error-500 text-center">Failed to load sections.</p>}

        {!isLoading &&
          !error &&
          sections.map((section) => (
            <CategorySection key={section.categorySlug} section={section} />
          ))}

        {/* If no sections have products, show a small fallback */}
        {!isLoading && !error && sections.every((s) => s.products.length === 0) && (
          <p className="text-neutral-500 text-center py-8">
            No products available yet. Check back soon!
          </p>
        )}
      </div>

      {/* ================================================================ */}
      {/* Recently Viewed Strip (NEW – shows products the user visited)    */}
      {/* ================================================================ */}
      <RecentlyViewedStrip ids={recentIds} />
    </div>
  );
}

export default HomePage;
