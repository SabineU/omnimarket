// admin-frontend/src/__tests__/pages/OrdersPage.test.tsx
// Unit tests for the admin OrdersPage – table, filters, pagination, and detail modal.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import OrdersPage from '../../pages/OrdersPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

function renderWithProviders(): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('OrdersPage', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', (): void => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderWithProviders();
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error message on failure', async (): Promise<void> => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Orders error'));
    renderWithProviders();
    expect(await screen.findByText(/Orders error/i)).toBeInTheDocument();
  });

  it('shows empty state when no orders exist', async (): Promise<void> => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          orders: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 10 },
        },
      },
    });
    renderWithProviders();
    expect(await screen.findByText('No orders found.')).toBeInTheDocument();
  });

  it('renders order rows', async (): Promise<void> => {
    const orders = [
      {
        id: 'order-1',
        customer: { name: 'Alice', email: 'a@test.com' },
        totalAmount: '149.99',
        status: 'CONFIRMED',
        createdAt: '2026-06-01T10:00:00Z',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { orders, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });
    renderWithProviders();
    expect(await screen.findByText('Alice')).toBeInTheDocument();
  });

  // ---- Detail modal tests ----
  it('opens detail modal when a row is clicked and shows order items with seller names', async (): Promise<void> => {
    // Mock list
    const orders = [
      {
        id: 'order-1',
        customer: { name: 'Alice', email: 'a@test.com' },
        totalAmount: '149.99',
        status: 'CONFIRMED',
        createdAt: '2026-06-01T10:00:00Z',
      },
    ];
    // Mock detail
    const detail = {
      id: 'order-1',
      customer: { name: 'Alice', email: 'a@test.com' },
      status: 'CONFIRMED',
      totalAmount: '149.99',
      createdAt: '2026-06-01T10:00:00Z',
      items: [
        {
          id: 'item-1',
          quantity: 2,
          priceAtTime: '74.995',
          product: {
            name: 'Test Product',
            images: [{ url: '/test.jpg' }],
            seller: { storeName: 'Test Seller' },
          },
          variation: null,
        },
      ],
    };

    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: { orders, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
        },
      })
      .mockResolvedValueOnce({
        data: { status: 'success', data: { order: detail } },
      });

    renderWithProviders();

    // Click the row
    await userEvent.click(await screen.findByTestId('order-row-order-1'));

    // Modal should appear with detail content
    expect(await screen.findByTestId('order-detail-modal')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Sold by: Test Seller')).toBeInTheDocument();
    expect(screen.getByText('$149.99')).toBeInTheDocument();
  });

  it('closes the modal when backdrop is clicked', async (): Promise<void> => {
    const orders = [
      {
        id: 'order-1',
        customer: { name: 'Alice', email: 'a@test.com' },
        totalAmount: '149.99',
        status: 'CONFIRMED',
        createdAt: '2026-06-01T10:00:00Z',
      },
    ];
    const detail = {
      id: 'order-1',
      customer: { name: 'Alice', email: 'a@test.com' },
      status: 'CONFIRMED',
      totalAmount: '149.99',
      createdAt: '2026-06-01T10:00:00Z',
      items: [],
    };

    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: { orders, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
        },
      })
      .mockResolvedValueOnce({
        data: { status: 'success', data: { order: detail } },
      });

    renderWithProviders();
    await userEvent.click(await screen.findByTestId('order-row-order-1'));
    await screen.findByTestId('order-detail-modal');

    // Click backdrop
    await userEvent.click(screen.getByTestId('modal-backdrop'));
    expect(screen.queryByTestId('order-detail-modal')).not.toBeInTheDocument();
  });
});
