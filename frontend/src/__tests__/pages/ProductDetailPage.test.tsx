// frontend/src/__tests__/pages/ProductDetailPage.test.tsx
// Tests for the product detail page, including SEO meta tags.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async'; // <-- NEW
import ProductDetailPage from '../../pages/ProductDetailPage';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';

// ---- Mocks ----
vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock(
  '../../hooks/useCartMutation',
  (): {
    useCartMutation: () => { mutate: ReturnType<typeof vi.fn>; isPending: boolean };
  } => ({
    useCartMutation: () => ({ mutate: vi.fn(), isPending: false }),
  }),
);
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

// ---- Helpers ----
function renderPage(slug = 'test-product'): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        {' '}
        {/* <-- NEW */}
        <MemoryRouter initialEntries={[`/products/${slug}`]}>
          <Routes>
            <Route path="/products/:productSlug" element={<ProductDetailPage />} />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

function mockProduct(
  overrides: Partial<{
    name: string;
    description: string;
    images: { id: string; url: string; altText: string; sortOrder: number }[];
    relatedProducts: {
      id: string;
      name: string;
      slug: string;
      basePrice: number | string;
      images: { url: string; altText: string }[];
      averageRating: number | null;
      reviewCount: number;
    }[];
  }> = {},
): unknown {
  return {
    data: {
      status: 'success',
      data: {
        product: {
          id: 'p1',
          slug: 'test-product',
          name: overrides.name ?? 'Test Product',
          description: overrides.description ?? 'A great product for testing.',
          basePrice: 99.99,
          images: overrides.images ?? [
            { id: 'img1', url: 'http://example.com/img1.jpg', altText: 'Image 1', sortOrder: 0 },
            { id: 'img2', url: 'http://example.com/img2.jpg', altText: 'Image 2', sortOrder: 1 },
          ],
          sellerId: 's1',
          sellerName: 'Test Seller',
          categoryName: 'Electronics',
          variations: [],
          relatedProducts: overrides.relatedProducts ?? [],
        },
      },
    },
  };
}

beforeEach((): void => {
  vi.clearAllMocks();
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user: { id: 'u1', email: 'test@test.com', name: 'Test', role: 'CUSTOMER' },
  });
});

// =============================================================================
// Tests
// =============================================================================
describe('ProductDetailPage', () => {
  it('shows loading spinner initially', (): void => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderPage();
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error message on failure', async (): Promise<void> => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Fetch error'));
    renderPage();
    expect(await screen.findByText(/Error loading product/i)).toBeInTheDocument();
  });

  it('renders product details and sets SEO title and meta description', async (): Promise<void> => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockProduct());
    renderPage();

    // Wait for the heading to appear (ensures data has loaded)
    await screen.findByRole('heading', { name: 'Test Product' });

    // ---- SEO assertions ----
    // The browser title should include the product name
    expect(document.title).toBe('Test Product – OmniMarket');
    // The meta description should match the product description
    const metaDesc = document.querySelector('meta[name="description"]');
    expect(metaDesc).not.toBeNull();
    expect(metaDesc?.getAttribute('content')).toBe('A great product for testing.');

    // Open Graph title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle).not.toBeNull();
    expect(ogTitle?.getAttribute('content')).toBe('Test Product – OmniMarket');

    // Twitter Card title
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    expect(twitterTitle).not.toBeNull();
    expect(twitterTitle?.getAttribute('content')).toBe('Test Product – OmniMarket');
  });

  it('switches main image when a thumbnail is clicked', async (): Promise<void> => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockProduct());
    renderPage();

    const thumb2 = await screen.findByTestId('thumbnail-1');
    expect(thumb2).toBeInTheDocument();

    await userEvent.click(thumb2);

    const mainImage = screen.getByTestId('main-product-image') as HTMLImageElement;
    expect(mainImage.src).toContain('img2.jpg');
  });

  // ---- Related Products ----
  it('displays related products when present', async (): Promise<void> => {
    const related = [
      {
        id: 'r1',
        name: 'Related Product A',
        slug: 'related-a',
        basePrice: 49.99,
        images: [{ url: 'http://example.com/related.jpg', altText: 'Related' }],
        averageRating: 4.0,
        reviewCount: 10,
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockProduct({ relatedProducts: related }),
    );
    renderPage();

    expect(await screen.findByText('You might also like')).toBeInTheDocument();
    expect(screen.getByText('Related Product A')).toBeInTheDocument();
    const link = screen.getByTestId('related-product-related-a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/products/related-a');
  });

  it('does not show related products section when array is empty', async (): Promise<void> => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockProduct({ relatedProducts: [] }),
    );
    renderPage();

    await screen.findByRole('heading', { name: 'Test Product' });
    expect(screen.queryByText('You might also like')).not.toBeInTheDocument();
  });
});
