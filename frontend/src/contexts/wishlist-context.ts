// frontend/src/contexts/wishlist-context.ts
// Holds the WishlistContext definition and its TypeScript types.
// Separating the context from the provider satisfies React Fast Refresh.
import { createContext } from 'react';

/** Minimal product information saved in the wishlist */
export interface WishlistItem {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  imageUrl: string | null;
}

export interface WishlistContextValue {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  count: number;
}

export const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);
