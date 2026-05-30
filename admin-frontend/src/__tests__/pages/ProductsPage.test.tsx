// admin-frontend/src/__tests__/pages/ProductsPage.test.tsx
// Unit tests for the admin ProductsPage (moderation queue).
// Tests the table, status dropdown, detail modal, and modal interactions.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ProductsPage from '../../pages/ProductsPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn(), patch: vi.fn() } }));
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

  // ---- Existing tests for loading, error, table ----
  it('shows loading spinner initially', () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderWithProviders();
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error message on failure', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Products error'));
    renderWithProviders();
    expect(await screen.findByText(/Products error/i)).toBeInTheDocument();
  });

  it('renders product rows with status dropdown and Update button', async () => {
    const products = [
      {
        id: '1',
        name: 'Test Product',
        status: 'PENDING',
        basePrice: 10,
        sellerName: 'Seller1',
        categoryName: 'Electronics',
        slug: '',
        description: '',
        brand: null,
        sellerId: '',
        createdAt: '',
        images: [],
        variations: [],
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { products, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });
    renderWithProviders();

    await screen.findByText('Test Product');
    expect(screen.getByTestId('status-select-1')).toBeInTheDocument();
    expect(screen.getByTestId('update-status-1')).toBeInTheDocument();
  });

  // ---- Detail modal tests ----
  it('opens the detail modal when a product row is clicked', async () => {
    const products = [
      {
        id: '1',
        name: 'Detailed Product',
        status: 'DRAFT',
        basePrice: 99.99,
        description: 'A great product',
        brand: 'TestBrand',
        categoryName: 'Electronics',
        sellerName: 'Test Seller',
        slug: '',
        sellerId: '',
        createdAt: '',
        images: [{ id: 'img1', url: 'http://example.com/img.jpg', altText: 'Image' }],
        variations: [
          { id: 'var1', sku: 'SKU1', size: 'M', color: 'Red', priceModifier: 0, stockQty: 5 },
        ],
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { products, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });
    renderWithProviders();

    await screen.findByText('Detailed Product');
    // Click the row
    await userEvent.click(screen.getByTestId('product-row-1'));

    // The detail modal should appear
    const modal = await screen.findByTestId('product-detail-modal');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText('A great product')).toBeInTheDocument();
    expect(screen.getByText('TestBrand')).toBeInTheDocument();
    expect(screen.getByText('Test Seller')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
    // Image and variation details
    expect(screen.getByAltText('Image')).toBeInTheDocument();
    expect(screen.getByText('SKU1')).toBeInTheDocument();
    expect(screen.getByText('Size: M')).toBeInTheDocument();
    expect(screen.getByText('Color: Red')).toBeInTheDocument();
    expect(screen.getByText('Stock: 5')).toBeInTheDocument();
  });

  it('closes the detail modal when the backdrop is clicked', async () => {
    const products = [
      {
        id: '1',
        name: 'Product',
        status: 'DRAFT',
        basePrice: 10,
        sellerName: 'S',
        categoryName: 'C',
        slug: '',
        description: '',
        brand: null,
        sellerId: '',
        createdAt: '',
        images: [],
        variations: [],
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { products, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });
    renderWithProviders();
    await screen.findByText('Product');
    await userEvent.click(screen.getByTestId('product-row-1'));
    expect(await screen.findByTestId('product-detail-modal')).toBeInTheDocument();

    // Click the backdrop (data-testid="modal-backdrop")
    await userEvent.click(screen.getByTestId('modal-backdrop'));
    // The modal should disappear
    expect(screen.queryByTestId('product-detail-modal')).not.toBeInTheDocument();
  });

  it('updates product status from the detail modal', async () => {
    const products = [
      {
        id: '1',
        name: 'Product',
        status: 'DRAFT',
        basePrice: 10,
        sellerName: 'S',
        categoryName: 'C',
        slug: '',
        description: '',
        brand: null,
        sellerId: '',
        createdAt: '',
        images: [],
        variations: [],
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { products, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    renderWithProviders();
    await screen.findByText('Product');
    await userEvent.click(screen.getByTestId('product-row-1'));
    await screen.findByTestId('product-detail-modal');

    // Change the status dropdown in the modal
    const dropdown = screen.getByTestId('detail-status-select-1');
    await userEvent.selectOptions(dropdown, 'ACTIVE');

    // Click the Update button in the modal
    await userEvent.click(screen.getByTestId('detail-update-status-1'));

    expect(apiClient.patch).toHaveBeenCalledWith('/admin/products/1/status', { status: 'ACTIVE' });
  });
});
