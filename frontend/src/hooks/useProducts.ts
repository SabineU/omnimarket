// frontend/src/hooks/useProducts.ts
// React Query hook that fetches the public product listing with filters.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** All filter options accepted by the product listing API */
export interface ProductFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string; // price_asc, price_desc, name_asc, name_desc, newest
  page?: number;
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
 * Fetch a paginated, filtered list of products.
 * All filter values are optional – omitting them uses the API defaults.
 */
export function useProducts(filters: ProductFilters = {}): UseQueryResult<ProductsResponse, Error> {
  return useQuery<ProductsResponse, Error>({
    // The query key includes all filters so React Query caches each unique combination
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
      if (filters.sort) params.set('sort', filters.sort);
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 12));

      const { data } = await apiClient.get<ProductsResponse>(`/products?${params.toString()}`);
      return data;
    },
  });
}
