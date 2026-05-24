// seller-frontend/src/__tests__/pages/OrdersPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import OrdersPage from '../../pages/OrdersPage';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

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
    (apiClient.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderWithProviders();
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error message on failure', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Orders error'));
    renderWithProviders();
    expect(await screen.findByText(/Orders error/i)).toBeInTheDocument();
  });

  it('shows empty state when no orders', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { orders: [] } },
    });
    renderWithProviders();
    expect(await screen.findByText(/No orders yet/i)).toBeInTheDocument();
  });

  it('renders an order card with items', async () => {
    const orders = [
      {
        id: 'order-1',
        status: 'CONFIRMED',
        totalAmount: '99.99',
        createdAt: '2025-05-01T00:00:00Z',
        trackingNumber: null,
        customer: { name: 'John Doe', email: 'john@test.com' },
        items: [
          {
            id: 'item-1',
            quantity: 1,
            priceAtTime: 99.99,
            product: { name: 'Test Product', images: [] },
            variation: null,
          },
        ],
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { orders } },
    });
    renderWithProviders();

    const orderCard = await screen.findByTestId('seller-order-card-order-1');
    expect(orderCard).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  it('shows tracking input when "Mark as Shipped" is clicked', async () => {
    const orders = [
      {
        id: 'order-1',
        status: 'CONFIRMED',
        totalAmount: '99.99',
        createdAt: '2025-05-01T00:00:00Z',
        trackingNumber: null,
        customer: { name: 'John Doe', email: 'john@test.com' },
        items: [
          {
            id: 'item-1',
            quantity: 1,
            priceAtTime: 99.99,
            product: { name: 'Test Product', images: [] },
            variation: null,
          },
        ],
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { orders } },
    });
    renderWithProviders();

    // Click the "Mark as Shipped" button
    await userEvent.click(await screen.findByTestId('ship-order-order-1'));

    // The tracking number input should appear
    expect(screen.getByTestId('tracking-input-order-1')).toBeInTheDocument();
    expect(screen.getByTestId('tracking-submit-order-1')).toBeInTheDocument();
  });

  it('ships an order with tracking number', async () => {
    const orders = [
      {
        id: 'order-1',
        status: 'CONFIRMED',
        totalAmount: '99.99',
        createdAt: '2025-05-01T00:00:00Z',
        trackingNumber: null,
        customer: { name: 'John Doe', email: 'john@test.com' },
        items: [
          {
            id: 'item-1',
            quantity: 1,
            priceAtTime: 99.99,
            product: { name: 'Test Product', images: [] },
            variation: null,
          },
        ],
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { orders } },
    });
    // Mock the PATCH request for shipping
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { order: { id: 'order-1', status: 'SHIPPED' } } },
    });

    renderWithProviders();

    // Click "Mark as Shipped"
    await userEvent.click(await screen.findByTestId('ship-order-order-1'));

    // Fill tracking number
    const trackingInput = screen.getByTestId('tracking-input-order-1');
    await userEvent.type(trackingInput, '1Z999AA10123456784');

    // Click Ship
    await userEvent.click(screen.getByTestId('tracking-submit-order-1'));

    // Verify the PATCH call
    expect(apiClient.patch).toHaveBeenCalledWith('/seller/orders/order-1/status', {
      status: 'SHIPPED',
      trackingNumber: '1Z999AA10123456784',
    });
  });

  it('opens the confirm modal for a PENDING order and confirms it', async () => {
    const orders = [
      {
        id: 'order-pending',
        status: 'PENDING',
        totalAmount: '49.99',
        createdAt: '2025-05-01T00:00:00Z',
        trackingNumber: null,
        customer: { name: 'Jane', email: 'jane@test.com' },
        items: [
          {
            id: 'item-2',
            quantity: 1,
            priceAtTime: 49.99,
            product: { name: 'Another Product', images: [] },
            variation: null,
          },
        ],
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { orders } },
    });
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { order: { id: 'order-pending', status: 'CONFIRMED' } } },
    });

    renderWithProviders();

    // Click "Confirm Order" button
    await userEvent.click(await screen.findByTestId('confirm-order-order-pending'));

    // Confirm modal appears
    const confirmButton = await screen.findByTestId('confirm-modal-confirm');
    expect(confirmButton).toBeInTheDocument();

    // Click confirm
    await userEvent.click(confirmButton);

    expect(apiClient.patch).toHaveBeenCalledWith('/seller/orders/order-pending/status', {
      status: 'CONFIRMED',
    });
  });
});
