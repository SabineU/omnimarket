// admin-frontend/src/hooks/useAdminProducts.ts
// React Query hook to fetch products for the admin moderation queue.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Shape of a product returned by the admin products endpoint */
export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  // FIXED: basePrice can be a string (PostgreSQL Decimal) or a number
  basePrice: number | string;
  status: string; // "DRAFT", "PENDING", "ACTIVE", "INACTIVE"
  brand: string | null;
  sellerId: string;
  sellerName: string;
  categoryName: string;
  createdAt: string;
}

export interface AdminProductsResponse {
  status: string;
  data: {
    products: AdminProduct[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      limit: number;
    };
  };
}

/** Options for the product list query */
export interface AdminProductListParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch products with optional status filter, search, and pagination.
 */
export function useAdminProducts(
  params: AdminProductListParams = {},
): UseQueryResult<AdminProductsResponse, Error> {
  return useQuery<AdminProductsResponse, Error>({
    queryKey: ['admin-products', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.set('status', params.status);
      if (params.search) queryParams.set('search', params.search);
      if (params.page) queryParams.set('page', String(params.page));
      if (params.limit) queryParams.set('limit', String(params.limit));

      const { data } = await apiClient.get<AdminProductsResponse>(
        `/admin/products?${queryParams.toString()}`,
      );
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}
