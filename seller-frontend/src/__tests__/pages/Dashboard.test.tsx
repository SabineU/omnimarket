// seller-frontend/src/__tests__/pages/Dashboard.test.tsx
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

  it('shows error message on fetch failure', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Dashboard error'));
    renderWithProviders();

    const errorMsg = await screen.findByText(/Dashboard error/i);
    expect(errorMsg).toBeInTheDocument();
  });

  it('renders stat cards with data', async () => {
    const data = {
      todaySales: 120,
      pendingOrders: 3,
      totalProducts: 10,
      totalReviews: 5,
      averageRating: 4.2,
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: data },
    });

    renderWithProviders();

    // Wait for one of the stat values to appear
    const todaySales = await screen.findByTestId('stat-today-sales');
    expect(todaySales).toHaveTextContent('$120.00');
    expect(screen.getByTestId('stat-pending-orders')).toHaveTextContent('3');
    expect(screen.getByTestId('stat-total-products')).toHaveTextContent('10');
  });

  it('renders the chart section', async () => {
    const data = {
      todaySales: 50,
      pendingOrders: 1,
      totalProducts: 2,
      totalReviews: 3,
      averageRating: 3.5,
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: data },
    });

    renderWithProviders();

    // The chart is inside a ResponsiveContainer; we can at least check that the title appears
    const chartTitle = await screen.findByText('Performance Overview');
    expect(chartTitle).toBeInTheDocument();
  });
});
