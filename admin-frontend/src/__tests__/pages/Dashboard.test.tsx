// admin-frontend/src/__tests__/pages/Dashboard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../../pages/Dashboard';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

function renderWithProviders(): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>,
  );
}

describe('Dashboard', () => {
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
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Dashboard error'));
    renderWithProviders();
    expect(await screen.findByText(/Dashboard error/i)).toBeInTheDocument();
  });

  it('renders stat cards with data', async () => {
    const data = {
      totalRevenue: 1000,
      totalOrders: 5,
      totalCustomers: 3,
      totalSellers: 2,
      totalProducts: 8,
      recentOrders: [],
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data },
    });
    renderWithProviders();

    expect(await screen.findByTestId('stat-total-revenue')).toHaveTextContent('$1000.00');
    expect(screen.getByTestId('stat-total-orders')).toHaveTextContent('5');
    expect(screen.getByTestId('stat-total-customers')).toHaveTextContent('3');
    expect(screen.getByTestId('stat-total-sellers')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-total-products')).toHaveTextContent('8');
  });

  it('renders recent orders table', async () => {
    const data = {
      totalRevenue: 500,
      totalOrders: 3,
      totalCustomers: 2,
      totalSellers: 1,
      totalProducts: 4,
      recentOrders: [
        {
          id: 'order-1',
          customerName: 'Alice',
          totalAmount: 99.99,
          status: 'CONFIRMED',
          createdAt: '2025-01-01T00:00:00Z',
        },
      ],
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data },
    });
    renderWithProviders();

    expect(await screen.findByTestId('recent-orders-table')).toBeInTheDocument();
    expect(screen.getByTestId('recent-order-order-1')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
