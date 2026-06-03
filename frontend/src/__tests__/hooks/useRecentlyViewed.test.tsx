// frontend/src/__tests__/hooks/useRecentlyViewed.test.tsx
// Unit tests for the useRecentlyViewed hook.
// Verifies localStorage read/write, deduplication, max length, and addProduct.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderHookHelper(): ReturnType<
  typeof renderHook<ReturnType<typeof useRecentlyViewed>, unknown>
> {
  return renderHook<ReturnType<typeof useRecentlyViewed>, unknown>(() => useRecentlyViewed());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useRecentlyViewed', () => {
  // Clean localStorage before and after every test
  beforeEach((): void => {
    localStorage.clear();
  });

  afterEach((): void => {
    localStorage.clear();
  });

  it('should start with an empty list when localStorage is empty', (): void => {
    const { result } = renderHookHelper();
    expect(result.current.ids).toEqual([]);
  });

  it('should restore existing IDs from localStorage', (): void => {
    const stored = ['id1', 'id2'];
    localStorage.setItem('omnimarket_recently_viewed', JSON.stringify(stored));

    const { result } = renderHookHelper();
    expect(result.current.ids).toEqual(stored);
  });

  it('should add a new product ID to the front of the list', (): void => {
    const { result } = renderHookHelper();

    act((): void => {
      result.current.addProduct('new-id');
    });

    expect(result.current.ids[0]).toBe('new-id');
    expect(result.current.ids).toHaveLength(1);

    // Verify it was saved to localStorage
    const stored: string[] = JSON.parse(
      localStorage.getItem('omnimarket_recently_viewed') ?? '[]',
    ) as string[];
    expect(stored).toEqual(['new-id']);
  });

  it('should move an existing ID to the front without duplicating', (): void => {
    localStorage.setItem(
      'omnimarket_recently_viewed',
      JSON.stringify(['first', 'second', 'third']),
    );

    const { result } = renderHookHelper();

    act((): void => {
      result.current.addProduct('second');
    });

    expect(result.current.ids).toEqual(['second', 'first', 'third']);
    expect(result.current.ids).toHaveLength(3);
  });

  it('should limit the list to 8 items', (): void => {
    const eight = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    localStorage.setItem('omnimarket_recently_viewed', JSON.stringify(eight));

    const { result } = renderHookHelper();

    act((): void => {
      result.current.addProduct('new');
    });

    expect(result.current.ids).toHaveLength(8);
    expect(result.current.ids[0]).toBe('new');
    expect(result.current.ids).not.toContain('h');
  });

  it('should persist the list to localStorage after addProduct', (): void => {
    const { result } = renderHookHelper();

    act((): void => {
      result.current.addProduct('p1');
    });

    const stored: string[] = JSON.parse(
      localStorage.getItem('omnimarket_recently_viewed') ?? '[]',
    ) as string[];
    expect(stored).toEqual(['p1']);
  });
});
