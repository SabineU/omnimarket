// seller-frontend/src/__tests__/pages/ProductsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ProductsPage from '../../pages/ProductsPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
// Fix: add explicit return type to the mock factory
vi.mock(
  '../../hooks/useCategories',
  (): {
    useCategories: () => { data: { data: { categories: never[] } }; isLoading: boolean };
  } => ({
    useCategories: () => ({ data: { data: { categories: [] } }, isLoading: false }),
  }),
);

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

  it('shows error message on fetch failure', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Products error'));
    renderWithProviders();
    expect(await screen.findByText(/Products error/i)).toBeInTheDocument();
  });

  it('shows empty state when no products', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { products: [] } },
    });
    renderWithProviders();
    expect(await screen.findByText(/haven't listed any products/i)).toBeInTheDocument();
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
    expect(await screen.findByText('Test Product')).toBeInTheDocument();
    expect(screen.getByTestId('products-table')).toBeInTheDocument();
  });

  it('opens the product form modal when Add Product is clicked', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { products: [] } },
    });
    renderWithProviders();
    await userEvent.click(await screen.findByTestId('add-product-button'));
    expect(await screen.findByTestId('product-form-backdrop')).toBeInTheDocument();
  });

  it('opens the edit product modal when Edit is clicked', async () => {
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
        description: 'A test product description.',
        brand: null,
        createdAt: new Date().toISOString(),
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { products } },
    });
    renderWithProviders();
    await userEvent.click(await screen.findByTestId('edit-product-1111'));
    expect(await screen.findByTestId('product-form-backdrop')).toBeInTheDocument();
  });

  it('opens the delete confirmation modal when Delete is clicked', async () => {
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
    await userEvent.click(await screen.findByTestId('delete-product-1111'));
    expect(await screen.findByTestId('confirm-modal-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-modal-cancel')).toBeInTheDocument();
  });

  it('calls deleteProduct when confirm is clicked in the delete modal', async () => {
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
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
    renderWithProviders();
    await userEvent.click(await screen.findByTestId('delete-product-1111'));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(apiClient.delete).toHaveBeenCalledWith('/seller/products/1111');
  });

  it('does not crash when importing an empty CSV', async () => {
    // Fix: use a typed empty array instead of `any`
    const products: { id: string; name: string; status: string; basePrice: number }[] = [];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { products } },
    });
    renderWithProviders();
    const fileInput = (await screen.findByTestId('csv-file-input')) as HTMLInputElement;
    const file = new File([''], 'empty.csv', { type: 'text/csv' });
    await userEvent.upload(fileInput, file);
    expect(screen.getByTestId('seller-products-page')).toBeInTheDocument();
  });
});
