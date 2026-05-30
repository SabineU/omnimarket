// frontend/src/hooks/useHomepageSections.ts
// Fetches multiple category sections for the homepage, each containing a set
// of the newest products in that category.  Uses React Query's useQueries to
// batch multiple requests so they all load in parallel.
import { useQueries } from '@tanstack/react-query';
import { useCategories } from './useCategories';
import { apiClient } from '../lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal product shape returned by the listing API */
interface SectionProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number | string;
  images: { url: string; altText: string }[];
  averageRating: number | null;
  reviewCount: number;
}

interface ProductsResponse {
  status: string;
  data: {
    products: SectionProduct[];
  };
}

/** A single category section displayed on the homepage */
export interface HomepageSection {
  categorySlug: string;
  categoryName: string;
  products: SectionProduct[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetch homepage sections – one per top‑level category, each with up to
 * `limit` newest products in that category.
 *
 * @param limit – max number of products per section (default 4)
 * @returns sections array + loading/error state
 */
export function useHomepageSections(limit = 4): {
  sections: HomepageSection[];
  isLoading: boolean;
  error: Error | null;
} {
  // 1. Fetch the category tree so we know which categories are top‑level
  const { data: catData, isLoading: catLoading, error: catError } = useCategories();

  // Extract top‑level categories (parentId is null) – these become our sections
  const topCategories = catData?.data.categories.filter((cat) => !cat.parentId) ?? [];

  // 2. For each top‑level category, fetch its newest products
  const productQueries = useQueries({
    queries: topCategories.map((cat) => ({
      queryKey: ['homepage-section', cat.slug, limit],
      queryFn: async (): Promise<SectionProduct[]> => {
        const params = new URLSearchParams();
        params.set('category', cat.slug);
        params.set('sort', 'newest');
        params.set('limit', String(limit));
        const { data } = await apiClient.get<ProductsResponse>(`/products?${params.toString()}`);
        return data.data.products;
      },
      // Only run when category data has arrived
      enabled: !!catData,
      // Keep data fresh for 5 minutes – categories rarely change
      staleTime: 5 * 60 * 1000,
    })),
  });

  // 3. Combine category metadata with fetched products
  const sections: HomepageSection[] = topCategories.map((cat, index) => ({
    categorySlug: cat.slug,
    categoryName: cat.name,
    products: productQueries[index]?.data ?? [],
  }));

  // Loading is true while categories load OR any product query is still loading
  const isLoading = catLoading || productQueries.some((q) => q.isLoading);

  // Collect the first error we encounter (categories or any product query)
  const error = catError ?? productQueries.find((q) => q.error)?.error ?? null;

  return { sections, isLoading, error };
}
