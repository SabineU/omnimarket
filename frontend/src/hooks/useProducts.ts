// frontend/src/hooks/useProducts.ts
// React Query hook that fetches the public product listing using Axios.
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
 * Fetch a paginated list of products.
 * @param page – current page (default 1)
 * @param search – optional search term
 */
export function useProducts(
  page: number = 1,
  search?: string,
): UseQueryResult<ProductsResponse, Error> {
  return useQuery<ProductsResponse, Error>({
    queryKey: ['products', { page, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '12');
      if (search) params.set('search', search);

      const { data } = await apiClient.get<ProductsResponse>(`/products?${params.toString()}`);
      return data;
    },
  });
}
