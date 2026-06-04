// admin-frontend/src/__tests__/pages/OrdersPage.test.tsx
// Unit tests for the admin OrdersPage – table, filters, pagination.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import OrdersPage from '../../pages/OrdersPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
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

  it('renders order rows with correct data', async (): Promise<void> => {
    const orders = [
      {
        id: '11111111-2222-3333-4444-555555555555',
        customer: { name: 'Alice', email: 'alice@test.com' },
        totalAmount: '149.99',
        status: 'CONFIRMED',
        createdAt: '2026-06-01T10:00:00Z',
      },
      {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        customer: { name: 'Bob', email: 'bob@test.com' },
        totalAmount: '49.50',
        status: 'SHIPPED',
        createdAt: '2026-06-02T12:00:00Z',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          orders,
          pagination: { currentPage: 1, totalPages: 1, totalItems: 2, limit: 10 },
        },
      },
    });
    renderWithProviders();

    const table = await screen.findByTestId('admin-orders-table');
    expect(table).toBeInTheDocument();

    // Check customer names
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Check status badges
    expect(
      screen.getByTestId('order-status-11111111-2222-3333-4444-555555555555'),
    ).toHaveTextContent('Confirmed');
    expect(
      screen.getByTestId('order-status-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
    ).toHaveTextContent('Shipped');

    // Check totals (they are formatted)
    expect(screen.getByText('$149.99')).toBeInTheDocument();
    expect(screen.getByText('$49.50')).toBeInTheDocument();
  });

  it('filters by status when dropdown changes', async (): Promise<void> => {
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
    await screen.findByTestId('admin-orders-page');

    const filterSelect = screen.getByTestId('order-status-filter');
    await userEvent.selectOptions(filterSelect, 'SHIPPED');

    const calls = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toContain('status=SHIPPED');
  });

  it('paginates to the next page', async (): Promise<void> => {
    const page1 = [
      {
        id: 'p1-order',
        customer: { name: 'Page1', email: 'p1@t.com' },
        totalAmount: '10',
        status: 'CONFIRMED',
        createdAt: '2026-06-01T10:00:00Z',
      },
    ];
    const page2 = [
      {
        id: 'p2-order',
        customer: { name: 'Page2', email: 'p2@t.com' },
        totalAmount: '20',
        status: 'SHIPPED',
        createdAt: '2026-06-02T10:00:00Z',
      },
    ];

    (apiClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            orders: page1,
            pagination: { currentPage: 1, totalPages: 2, totalItems: 2, limit: 1 },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            orders: page2,
            pagination: { currentPage: 2, totalPages: 2, totalItems: 2, limit: 1 },
          },
        },
      });

    renderWithProviders();

    await screen.findByText('Page1');
    expect(screen.queryByText('Page2')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('next-page'));

    expect(await screen.findByText('Page2')).toBeInTheDocument();
  });
});
