// frontend/src/hooks/useProductReviews.ts
// Fetches paginated reviews for a given product.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** A single review */
export interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: number; // 1-5
  comment: string | null;
  createdAt: string;
  customer: { name: string };
}

interface ReviewsResponse {
  status: string;
  data: {
    reviews: Review[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      limit: number;
    };
  };
}

/**
 * Fetch reviews for a product.
 * @param productId – the product UUID
 * @param page – current page (default 1)
 * @param limit – items per page (default 5)
 */
export function useProductReviews(
  productId: string | undefined,
  page = 1,
  limit = 5,
): UseQueryResult<ReviewsResponse, Error> {
  return useQuery<ReviewsResponse, Error>({
    queryKey: ['product-reviews', productId, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      const { data } = await apiClient.get<ReviewsResponse>(
        `/products/${productId}/reviews?${params.toString()}`,
      );
      return data;
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });
}
