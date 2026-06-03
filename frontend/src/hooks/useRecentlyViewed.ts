// frontend/src/hooks/useRecentlyViewed.ts
// Custom hook that tracks recently viewed product IDs in localStorage.
// Provides a list of IDs (most recent first) and an addProduct() function
// to record a new view.
import { useState, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key under which the list is stored */
const STORAGE_KEY = 'omnimarket_recently_viewed';

/** Maximum number of recently viewed products to keep */
const MAX_ITEMS = 8;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseRecentlyViewedReturn {
  /** Array of product IDs, most recent first */
  ids: string[];
  /** Call this when a product is viewed to record it */
  addProduct: (productId: string) => void;
}

/**
 * Hook that reads and writes the recently viewed product IDs.
 *
 * Usage:
 *   const { ids, addProduct } = useRecentlyViewed();
 *   // Call addProduct(product.id) when a product detail page loads.
 *   // Use ids to fetch product details for the strip.
 */
export function useRecentlyViewed(): UseRecentlyViewedReturn {
  // Lazy initialiser – reads from localStorage only once during mount
  const [ids, setIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        // Validate that it's an array of strings
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item): item is string => typeof item === 'string' && item.length > 0,
          );
        }
      }
    } catch {
      // If JSON parsing fails, reset to empty (handled by returning [])
    }
    return [];
  });

  // Persist to localStorage whenever the ids array changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // localStorage might be full or disabled – fail silently
    }
  }, [ids]);

  /**
   * Record a product view.
   * Moves the product ID to the front of the list (most recent),
   * removes any duplicate, and trims the list to MAX_ITEMS.
   */
  const addProduct = useCallback((productId: string) => {
    setIds((prev) => {
      // Remove the product if it already exists, then add it at the beginning
      const filtered = prev.filter((id) => id !== productId);
      const next = [productId, ...filtered].slice(0, MAX_ITEMS);
      return next;
    });
  }, []);

  return { ids, addProduct };
}
