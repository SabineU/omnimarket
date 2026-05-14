// frontend/src/hooks/useInfiniteProducts.ts
// Provides infinite-scroll product loading using React Query's useInfiniteQuery.
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Filter options shared with the product listing */
export interface ProductFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  limit?: number;
}

/** Shape of a product returned by GET /api/products */
interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  brand?: string;
  averageRating: number | null;
  reviewCount: number;
  images: { url: string; altText: string }[];
}

/** The paginated response from the API */
interface ProductsResponse {
  status: string;
  data: {
    products: Product[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      limit: number;
    };
  };
}

/**
 * Infinite query hook for products.
 * @param filters – search, category, price, sort, etc. (page is handled automatically)
 */
export function useInfiniteProducts(
  filters: ProductFilters = {},
): ReturnType<typeof useInfiniteQuery<ProductsResponse, Error>> {
  return useInfiniteQuery<ProductsResponse, Error>({
    queryKey: ['products', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('limit', String(filters.limit ?? 12));

      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
      if (filters.sort) params.set('sort', filters.sort);

      const { data } = await apiClient.get<ProductsResponse>(`/products?${params.toString()}`);
      return data;
    },
    getNextPageParam: (lastPage) => {
      const { currentPage, totalPages } = lastPage.data.pagination;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
  });
}
