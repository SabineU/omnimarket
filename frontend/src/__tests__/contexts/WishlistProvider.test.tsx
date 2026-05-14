// frontend/src/__tests__/contexts/WishlistProvider.test.tsx
// Unit tests for the WishlistProvider and useWishlist hook.
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, type RenderHookResult } from '@testing-library/react';
import { WishlistProvider } from '../../contexts/WishlistProvider';
import { useWishlist } from '../../hooks/useWishlist';
import type { WishlistContextValue } from '../../contexts/wishlist-context';

// Helper: render the hook wrapped in the provider
function renderWishlistHook(): RenderHookResult<WishlistContextValue, unknown> {
  // renderHook requires two type arguments: the result type and the initial props type.
  // useWishlist takes no props, so we pass `unknown`.
  return renderHook<WishlistContextValue, unknown>(() => useWishlist(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <WishlistProvider>{children}</WishlistProvider>
    ),
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe('WishlistProvider', () => {
  it('should start with an empty wishlist', () => {
    const { result } = renderWishlistHook();
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('should add an item', () => {
    const { result } = renderWishlistHook();
    const product = {
      id: 'p1',
      name: 'Test Phone',
      slug: 'test-phone',
      basePrice: 500,
      imageUrl: null,
    };
    act(() => {
      result.current.addItem(product);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.count).toBe(1);
    expect(result.current.isInWishlist('p1')).toBe(true);
  });

  it('should not duplicate an item', () => {
    const { result } = renderWishlistHook();
    const product = { id: 'p1', name: 'A', slug: 'a', basePrice: 1, imageUrl: null };
    act(() => {
      result.current.addItem(product);
      result.current.addItem(product);
    });
    expect(result.current.items).toHaveLength(1);
  });

  it('should remove an item', () => {
    const { result } = renderWishlistHook();
    const product = { id: 'p1', name: 'A', slug: 'a', basePrice: 1, imageUrl: null };
    act(() => {
      result.current.addItem(product);
      result.current.removeItem('p1');
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.isInWishlist('p1')).toBe(false);
  });

  it('should persist to localStorage', () => {
    const { result } = renderWishlistHook();
    const product = { id: 'p1', name: 'A', slug: 'a', basePrice: 1, imageUrl: null };
    act(() => {
      result.current.addItem(product);
    });
    const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('p1');
  });
});
