// frontend/src/contexts/WishlistContext.tsx
// Provides wishlist state (an array of saved product summaries) to the entire app.
// The wishlist is persisted in localStorage so it survives page reloads.
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { WishlistContext, type WishlistItem } from './wishlist-context';

export function WishlistProvider({ children }: { children: ReactNode }): React.JSX.Element {
  // Initialise the state from localStorage (if available)
  const [items, setItems] = useState<WishlistItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('wishlist');
      return stored ? (JSON.parse(stored) as WishlistItem[]) : [];
    } catch {
      return [];
    }
  });

  // Sync back to localStorage every time the list changes
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: WishlistItem) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev; // already saved
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const isInWishlist = useCallback(
    (productId: string) => items.some((p) => p.id === productId),
    [items],
  );

  const value = {
    items,
    addItem,
    removeItem,
    isInWishlist,
    count: items.length,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
