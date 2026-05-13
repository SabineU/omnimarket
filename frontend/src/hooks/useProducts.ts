// frontend/src/hooks/useProducts.ts
// Example React Query hook – fetches the public product listing.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

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

/** The paginated response from our API */
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
 * Hook to fetch a paginated list of products with optional search/filters.
 * @param page – current page number (default 1)
 * @param search – optional search term
 */
export function useProducts(
  page: number = 1,
  search?: string,
): UseQueryResult<ProductsResponse, Error> {
  return useQuery<ProductsResponse, Error>({
    queryKey: ['products', { page, search }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '12');
      if (search) params.set('search', search);
      return apiClient<ProductsResponse>(`/products?${params.toString()}`);
    },
  });
}
