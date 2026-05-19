// frontend/src/__tests__/components/OrdersPage.test.tsx
// Unit tests for the OrdersPage component.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders();
    // The Spinner is an SVG with animate-spin class
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows empty state when no orders exist', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { orders: [] } },
    });

    renderWithProviders();

    // Wait for the empty message to appear
    const emptyMessage = await screen.findByText('No orders yet');
    expect(emptyMessage).toBeInTheDocument();
    expect(screen.getByTestId('start-shopping-button')).toBeInTheDocument();
  });

  it('renders a list of orders', async () => {
    const orders = [
      {
        id: '11111111-2222-3333-4444-555555555555',
        status: 'CONFIRMED',
        totalAmount: '49.99',
        createdAt: new Date().toISOString(),
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { orders } },
    });

    renderWithProviders();

    // Wait for the order card to appear
    const orderCard = await screen.findByTestId('order-card-11111111-2222-3333-4444-555555555555');
    expect(orderCard).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('shows error message on API failure', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));

    renderWithProviders();

    const errorMessage = await screen.findByText('Failed to load orders');
    expect(errorMessage).toBeInTheDocument();
  });
});
