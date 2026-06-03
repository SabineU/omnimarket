// frontend/src/__tests__/pages/ProductDetailPage.test.tsx
// Tests for the product detail page, including SEO meta tags and seller rating.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ProductDetailPage from '../../pages/ProductDetailPage';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';

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
    sellerName: string;
    sellerRating: number | null;
    sellerReviewCount: number;
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
          sellerName: overrides.sellerName ?? 'Test Seller',
          sellerRating: overrides.sellerRating ?? null,
          sellerReviewCount: overrides.sellerReviewCount ?? 0,
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

  it('renders product details, sets SEO title and displays seller rating', async (): Promise<void> => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockProduct({ sellerRating: 4.8, sellerReviewCount: 25 }),
    );
    renderPage();

    await screen.findByRole('heading', { name: 'Test Product' });

    // SEO assertions
    expect(document.title).toBe('Test Product – OmniMarket');
    const metaDesc = document.querySelector('meta[name="description"]');
    expect(metaDesc?.getAttribute('content')).toBe('A great product for testing.');

    // ---- Seller rating assertions ----
    const sellerRatingElement = screen.getByTestId('seller-rating');
    expect(sellerRatingElement).toBeInTheDocument();
    expect(sellerRatingElement).toHaveTextContent('4.8');
    expect(sellerRatingElement).toHaveAttribute('title', 'Seller rating: 4.8 (25 reviews)');
  });

  it('does not show seller rating when sellerRating is null', async (): Promise<void> => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockProduct({ sellerRating: null }),
    );
    renderPage();

    await screen.findByRole('heading', { name: 'Test Product' });
    expect(screen.queryByTestId('seller-rating')).not.toBeInTheDocument();
  });

  it('switches main image when a thumbnail is clicked', async (): Promise<void> => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockProduct());
    renderPage();

    const thumb2 = await screen.findByTestId('thumbnail-1');
    await userEvent.click(thumb2);
    const mainImage = screen.getByTestId('main-product-image') as HTMLImageElement;
    expect(mainImage.src).toContain('img2.jpg');
  });

  it('displays related products when present', async (): Promise<void> => {
    const related = [
      {
        id: 'r1',
        name: 'Related A',
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
    expect(screen.getByText('Related A')).toBeInTheDocument();
    const link = screen.getByTestId('related-product-related-a');
    expect(link).toHaveAttribute('href', '/products/related-a');
  });

  it('hides related products section when empty', async (): Promise<void> => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockProduct({ relatedProducts: [] }),
    );
    renderPage();

    await screen.findByRole('heading', { name: 'Test Product' });
    expect(screen.queryByText('You might also like')).not.toBeInTheDocument();
  });
});
