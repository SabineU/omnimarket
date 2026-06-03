// frontend/src/__tests__/pages/ProductListPage.test.tsx
// Tests for the product listing page, including seller rating display.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ProductListPage from '../../pages/ProductListPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function renderPage(initialUrl = '/products'): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[initialUrl]}>
          <ProductListPage />
        </MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ProductListPage', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it('renders seller rating when sellerRating is provided', async (): Promise<void> => {
    const products = [
      {
        id: 'p1',
        name: 'Rated Product',
        slug: 'rated-product',
        basePrice: 49.99,
        images: [{ url: 'http://example.com/img.jpg', altText: 'Image' }],
        sellerName: 'Star Seller',
        sellerRating: 4.7,
        sellerReviewCount: 12,
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { items: products } },
    });

    renderPage('/products');

    // Wait for the product name to appear
    expect(await screen.findByText('Rated Product')).toBeInTheDocument();

    // Check that the seller rating badge exists with the correct value
    const ratingBadge = screen.getByTitle('Seller rating: 4.7 (12 reviews)');
    expect(ratingBadge).toBeInTheDocument();
    expect(ratingBadge).toHaveTextContent('4.7');
  });

  it('does not show seller rating when sellerRating is null', async (): Promise<void> => {
    const products = [
      {
        id: 'p2',
        name: 'No Rating Product',
        slug: 'no-rating',
        basePrice: 19.99,
        images: [],
        sellerName: 'New Seller',
        sellerRating: null,
        sellerReviewCount: 0,
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { items: products } },
    });

    renderPage('/products');

    await screen.findByText('No Rating Product');

    // The rating badge should not be present
    expect(screen.queryByTitle(/Seller rating/)).not.toBeInTheDocument();
  });
});
