// frontend/src/__tests__/pages/WishlistPage.test.tsx
// Unit tests for the WishlistPage component.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WishlistProvider } from '../../contexts/WishlistProvider';
import WishlistPage from '../../pages/WishlistPage';

function renderWithProvider(): ReturnType<typeof render> {
  // <-- added return type
  return render(
    <MemoryRouter>
      <WishlistProvider>
        <WishlistPage />
      </WishlistProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('WishlistPage', () => {
  it('should show empty state when wishlist is empty', () => {
    renderWithProvider();
    expect(screen.getByTestId('empty-wishlist')).toBeInTheDocument();
  });

  it('should display wishlist items when present', () => {
    const items = [
      {
        id: 'p1',
        name: 'Product A',
        slug: 'product-a',
        basePrice: 100,
        imageUrl: 'http://example.com/a.jpg',
      },
      {
        id: 'p2',
        name: 'Product B',
        slug: 'product-b',
        basePrice: 50,
        imageUrl: null,
      },
    ];
    localStorage.setItem('wishlist', JSON.stringify(items));

    renderWithProvider();

    expect(screen.getByTestId('wishlist-grid')).toBeInTheDocument();
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('Product B')).toBeInTheDocument();
    expect(screen.getByTestId('remove-wishlist-p1')).toBeInTheDocument();
    expect(screen.getByTestId('remove-wishlist-p2')).toBeInTheDocument();
  });
});
