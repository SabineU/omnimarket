// seller-frontend/src/__tests__/pages/ProductsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ProductsPage from '../../pages/ProductsPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function renderWithProviders(): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderWithProviders();
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows empty state when no products', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { products: [] } },
    });
    renderWithProviders();

    const emptyMessage = await screen.findByText(/haven't listed any products/i);
    expect(emptyMessage).toBeInTheDocument();
  });

  it('renders product rows when products exist', async () => {
    const products = [
      {
        id: '1111',
        name: 'Test Product',
        status: 'ACTIVE',
        basePrice: 99.99,
        images: [],
        variations: [],
        categoryId: 'cat1',
        slug: 'test-product',
        description: 'desc',
        brand: null,
        createdAt: new Date().toISOString(),
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { products } },
    });
    renderWithProviders();

    const productName = await screen.findByText('Test Product');
    expect(productName).toBeInTheDocument();
    expect(screen.getByTestId('products-table')).toBeInTheDocument();
  });
});
