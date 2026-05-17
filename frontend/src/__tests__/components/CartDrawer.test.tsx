// frontend/src/__tests__/components/CartDrawer.test.tsx
// Unit tests for the CartDrawer component.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CartDrawer from '../../components/CartDrawer';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';

vi.mock('../../hooks/useAuth');
vi.mock('../../hooks/useCart');
vi.mock('../../hooks/useUpdateCartItem', () => ({
  useUpdateCartItem: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));
vi.mock('../../hooks/useRemoveCartItem', () => ({
  useRemoveCartItem: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

// ---------------------------------------------------------------------------
// Helper – render with required providers
// ---------------------------------------------------------------------------
function renderWithProviders(ui: React.ReactElement): ReturnType<typeof render> {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('CartDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Already passing ----
  it('renders empty message when cart is empty', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: '1' } });
    (useCart as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { data: { items: [] } },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<CartDrawer isOpen onClose={vi.fn()} />);
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('renders cart items and subtotal', () => {
    const items = [
      {
        id: 'i1',
        productId: 'p1',
        quantity: 2,
        price: 10,
        lineTotal: 20,
        productName: 'Test',
        productImage: null,
        sellerId: 's1',
        sellerName: 'Seller',
      },
    ];
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: '1' } });
    (useCart as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { data: { items } },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<CartDrawer isOpen onClose={vi.fn()} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    const priceElements = screen.getAllByText('$20.00');
    expect(priceElements).toHaveLength(2);
    expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });
    (useCart as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    renderWithProviders(<CartDrawer isOpen onClose={onClose} />);
    await userEvent.click(screen.getByTestId('cart-drawer-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  // ---- NEW: Loading state ----
  it('shows spinner while loading', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: '1' } });
    (useCart as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderWithProviders(<CartDrawer isOpen onClose={vi.fn()} />);
    // The Spinner is an SVG with animate-spin class
    const spinner = document.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // ---- NEW: Error state ----
  it('shows error message when cart fails to load', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: '1' } });
    (useCart as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    });

    renderWithProviders(<CartDrawer isOpen onClose={vi.fn()} />);
    expect(screen.getByText('Could not load cart. Please try again.')).toBeInTheDocument();
  });

  // ---- NEW: Not logged in ----
  it('prompts user to sign in when not authenticated', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });
    (useCart as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    renderWithProviders(<CartDrawer isOpen onClose={vi.fn()} />);
    expect(screen.getByText('Sign in to see your cart.')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  // ---- NEW: Empty cart shows Continue Shopping link ----
  it('shows Continue Shopping button in empty cart', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: '1' } });
    (useCart as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { data: { items: [] } },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<CartDrawer isOpen onClose={vi.fn()} />);
    expect(screen.getByTestId('cart-empty-continue-shopping')).toBeInTheDocument();
    expect(screen.getByText('Continue Shopping')).toBeInTheDocument();
  });
});
