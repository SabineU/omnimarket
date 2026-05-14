// frontend/src/hooks/useFeaturedProducts.ts
// Fetches a small set of featured products for the homepage.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Minimal product info needed on the homepage */
interface FeaturedProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  averageRating: number | null;
  reviewCount: number;
  images: { url: string; altText: string }[];
}

interface FeaturedProductsResponse {
  status: string;
  data: {
    products: FeaturedProduct[];
  };
}

/**
 * Fetch the 4 newest products to display on the homepage.
 */
export function useFeaturedProducts(): UseQueryResult<FeaturedProductsResponse, Error> {
  return useQuery<FeaturedProductsResponse, Error>({
    queryKey: ['featuredProducts'],
    queryFn: async () => {
      const { data } = await apiClient.get<FeaturedProductsResponse>(
        '/products?sort=newest&limit=4',
      );
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
