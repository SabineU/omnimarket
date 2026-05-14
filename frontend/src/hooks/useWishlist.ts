// frontend/src/hooks/useWishlist.ts
// Custom hook to access the wishlist context.
import { useContext } from 'react';
import { WishlistContext, type WishlistContextValue } from '../contexts/wishlist-context';

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used inside a <WishlistProvider>');
  }
  return context;
}
