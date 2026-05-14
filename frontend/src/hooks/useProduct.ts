// frontend/src/hooks/useProduct.ts
// Fetches a single product by its slug from the public API.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Full product shape returned by GET /api/products/:slug */
export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  brand?: string;
  averageRating: number | null;
  reviewCount: number;
  images: { id: string; url: string; altText: string; sortOrder: number }[];
  variations: {
    id: string;
    sku: string;
    size?: string;
    color?: string;
    priceModifier: number;
    stockQty: number;
  }[];
  seller: {
    id: string;
    storeName: string;
  };
}

interface ProductDetailResponse {
  status: string;
  data: {
    product: ProductDetail;
  };
}

/**
 * Hook to fetch a single product by its URL slug.
 */
export function useProduct(slug: string): UseQueryResult<ProductDetailResponse, Error> {
  return useQuery<ProductDetailResponse, Error>({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data } = await apiClient.get<ProductDetailResponse>(`/products/${slug}`);
      return data;
    },
    enabled: !!slug, // only run the query when a slug is provided
  });
}
