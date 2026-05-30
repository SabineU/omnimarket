// admin-frontend/src/__tests__/pages/ProductsPage.test.tsx
// Unit tests for the admin ProductsPage (moderation queue).
// Updated to test the new status dropdown + Update button UI.
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
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { products, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });
    renderWithProviders();

    // Wait for the product to render
    await screen.findByText('Test Product');

    // Check that the status dropdown and Update button exist
    expect(screen.getByTestId('status-select-1')).toBeInTheDocument();
    expect(screen.getByTestId('update-status-1')).toBeInTheDocument();
  });

  it('dropdown is pre‑selected to the current product status', async () => {
    const products = [
      {
        id: '1',
        name: 'Draft Product',
        status: 'DRAFT',
        basePrice: 20,
        sellerName: 'Seller1',
        categoryName: 'Electronics',
        slug: '',
        description: '',
        brand: null,
        sellerId: '',
        createdAt: '',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { products, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });
    renderWithProviders();

    await screen.findByText('Draft Product');

    const dropdown = screen.getByTestId('status-select-1') as HTMLSelectElement;
    expect(dropdown.value).toBe('DRAFT');
  });

  it('calls the update mutation when Update is clicked with a new status', async () => {
    const products = [
      {
        id: '1',
        name: 'Test Product',
        status: 'DRAFT',
        basePrice: 10,
        sellerName: 'Seller1',
        categoryName: 'Electronics',
        slug: '',
        description: '',
        brand: null,
        sellerId: '',
        createdAt: '',
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

    await screen.findByText('Test Product');

    // Change the dropdown to ACTIVE
    const dropdown = screen.getByTestId('status-select-1');
    await userEvent.selectOptions(dropdown, 'ACTIVE');

    // Click Update
    await userEvent.click(screen.getByTestId('update-status-1'));

    expect(apiClient.patch).toHaveBeenCalledWith('/admin/products/1/status', { status: 'ACTIVE' });
  });

  it('sends the current status if the dropdown value is unchanged', async () => {
    const products = [
      {
        id: '1',
        name: 'Test Product',
        status: 'DRAFT',
        basePrice: 10,
        sellerName: 'Seller1',
        categoryName: 'Electronics',
        slug: '',
        description: '',
        brand: null,
        sellerId: '',
        createdAt: '',
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

    await screen.findByText('Test Product');
    // Click Update without changing the dropdown
    await userEvent.click(screen.getByTestId('update-status-1'));

    // The mutation should be called with the product's current status (DRAFT)
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/products/1/status', { status: 'DRAFT' });
  });

  // ---- Filters and pagination ----
  it('filters by status when the dropdown is changed', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          products: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 10 },
        },
      },
    });

    renderWithProviders();
    await screen.findByTestId('admin-products-page');

    const filterSelect = screen.getByTestId('product-status-filter');
    await userEvent.selectOptions(filterSelect, 'DRAFT');

    const calls = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toContain('status=DRAFT');
  });

  it('paginates to the next page', async () => {
    const page1 = [
      {
        id: '1',
        name: 'Product A',
        status: 'PENDING',
        basePrice: 10,
        sellerName: 'S',
        categoryName: 'C',
        slug: '',
        description: '',
        brand: null,
        sellerId: '',
        createdAt: '',
      },
    ];
    const page2 = [
      {
        id: '2',
        name: 'Product B',
        status: 'PENDING',
        basePrice: 20,
        sellerName: 'S',
        categoryName: 'C',
        slug: '',
        description: '',
        brand: null,
        sellerId: '',
        createdAt: '',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            products: page1,
            pagination: { currentPage: 1, totalPages: 2, totalItems: 2, limit: 1 },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            products: page2,
            pagination: { currentPage: 2, totalPages: 2, totalItems: 2, limit: 1 },
          },
        },
      });

    renderWithProviders();

    await screen.findByText('Product A');
    expect(screen.queryByText('Product B')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('next-page'));

    expect(await screen.findByText('Product B')).toBeInTheDocument();
    expect(screen.queryByText('Product A')).not.toBeInTheDocument();
  });
});
