// admin-frontend/src/__tests__/pages/ProductsPage.test.tsx
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

  it('renders product rows with approve/reject buttons for PENDING products', async () => {
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

    expect(await screen.findByText('Test Product')).toBeInTheDocument();
    expect(screen.getByTestId('approve-product-1')).toBeInTheDocument();
    expect(screen.getByTestId('reject-product-1')).toBeInTheDocument();
  });

  it('does not show approve/reject buttons for ACTIVE products', async () => {
    const products = [
      {
        id: '1',
        name: 'Active Product',
        status: 'ACTIVE',
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

    expect(await screen.findByText('Active Product')).toBeInTheDocument();
    expect(screen.queryByTestId('approve-product-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reject-product-1')).not.toBeInTheDocument();
  });

  it('calls approve mutation when Approve is clicked', async () => {
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
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    renderWithProviders();

    await screen.findByText('Test Product');
    await userEvent.click(screen.getByTestId('approve-product-1'));

    expect(apiClient.patch).toHaveBeenCalledWith('/admin/products/1/status', { status: 'ACTIVE' });
  });

  it('calls reject mutation when Reject is clicked', async () => {
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
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    renderWithProviders();

    await screen.findByText('Test Product');
    await userEvent.click(screen.getByTestId('reject-product-1'));

    expect(apiClient.patch).toHaveBeenCalledWith('/admin/products/1/status', {
      status: 'INACTIVE',
    });
  });
});
