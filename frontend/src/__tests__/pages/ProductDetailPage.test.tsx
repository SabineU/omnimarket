// frontend/src/__tests__/pages/ProductDetailPage.test.tsx
// Tests for the product detail page, including the new related products section.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductDetailPage from '../../pages/ProductDetailPage';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';

// ---- Mocks ----
vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
// FIXED: add explicit return type to the mock factory arrow function
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
      <MemoryRouter initialEntries={[`/products/${slug}`]}>
        <Routes>
          <Route path="/products/:productSlug" element={<ProductDetailPage />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Build a mock product response with optional related products */
function mockProduct(
  overrides: Partial<{
    name: string;
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
          description: 'A great product',
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

  it('renders product details', async (): Promise<void> => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockProduct());
    renderPage();

    // Use getByRole('heading') because the breadcrumb also contains the product name
    expect(await screen.findByRole('heading', { name: 'Test Product' })).toBeInTheDocument();
    expect(screen.getByText('Test Seller')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
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
