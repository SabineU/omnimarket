// frontend/src/__tests__/pages/WishlistPage.test.tsx
// Unit tests for WishlistPage, including shared wishlist and copy link.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WishlistProvider } from '../../contexts/WishlistProvider';
import WishlistPage from '../../pages/WishlistPage';
import toast from 'react-hot-toast';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithProvider(initialEntries = ['/wishlist']): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <WishlistProvider>
        <WishlistPage />
      </WishlistProvider>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('WishlistPage', () => {
  beforeEach((): void => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ---- Own wishlist ----
  it('shows empty state when wishlist is empty', (): void => {
    renderWithProvider();
    expect(screen.getByTestId('empty-wishlist')).toBeInTheDocument();
    // Copy button should not appear
    expect(screen.queryByTestId('copy-wishlist-link-button')).not.toBeInTheDocument();
  });

  it('shows wishlist items with remove buttons', (): void => {
    const items = [
      { id: 'p1', name: 'Product A', slug: 'product-a', basePrice: 100, imageUrl: null },
      { id: 'p2', name: 'Product B', slug: 'product-b', basePrice: 50, imageUrl: null },
    ];
    localStorage.setItem('wishlist', JSON.stringify(items));

    renderWithProvider();

    expect(screen.getByTestId('wishlist-grid')).toBeInTheDocument();
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('Product B')).toBeInTheDocument();
    expect(screen.getByTestId('remove-wishlist-p1')).toBeInTheDocument();
    expect(screen.getByTestId('remove-wishlist-p2')).toBeInTheDocument();
  });

  it('shows Copy Wishlist Link button when items exist', (): void => {
    const items = [{ id: 'p1', name: 'A', slug: 'a', basePrice: 1, imageUrl: null }];
    localStorage.setItem('wishlist', JSON.stringify(items));

    renderWithProvider();

    const copyButton = screen.getByTestId('copy-wishlist-link-button');
    expect(copyButton).toBeInTheDocument();
  });

  it('copies wishlist link to clipboard when button is clicked', async (): Promise<void> => {
    const items = [{ id: 'p1', name: 'A', slug: 'a', basePrice: 1, imageUrl: null }];
    localStorage.setItem('wishlist', JSON.stringify(items));

    renderWithProvider();

    const copyButton = screen.getByTestId('copy-wishlist-link-button');
    await userEvent.click(copyButton);

    // Clipboard should have been called with a URL containing the shared param
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    const callArg = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg).toContain('/wishlist?shared=');
    // Toast should appear
    expect(toast.success).toHaveBeenCalledWith('Wishlist link copied to clipboard!');
  });

  // ---- Shared wishlist ----
  it('renders shared wishlist with valid shared parameter', (): void => {
    const sharedItems = [
      { id: 's1', name: 'Shared Item', slug: 'shared-item', basePrice: 25, imageUrl: null },
    ];
    const encoded = encodeURIComponent(JSON.stringify(sharedItems));

    renderWithProvider([`/wishlist?shared=${encoded}`]);

    // Should display shared wishlist heading
    expect(screen.getByTestId('shared-wishlist')).toBeInTheDocument();
    expect(screen.getByText('Shared Wishlist')).toBeInTheDocument();
    expect(screen.getByText('Shared Item')).toBeInTheDocument();
    // Remove buttons should NOT be present
    expect(screen.queryByTestId('remove-wishlist-s1')).not.toBeInTheDocument();
  });

  it('shows empty shared wishlist when shared param is empty array', (): void => {
    const encoded = encodeURIComponent(JSON.stringify([]));

    renderWithProvider([`/wishlist?shared=${encoded}`]);

    expect(screen.getByTestId('empty-shared-wishlist')).toBeInTheDocument();
    expect(screen.getByText('This wishlist is empty.')).toBeInTheDocument();
  });

  it('shows error message for invalid shared parameter', (): void => {
    renderWithProvider(['/wishlist?shared=invalid-json']);

    expect(screen.getByTestId('invalid-shared-wishlist')).toBeInTheDocument();
    expect(screen.getByText(/invalid/i)).toBeInTheDocument();
  });
});
