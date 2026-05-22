// seller-frontend/src/hooks/useSellerProducts.ts
// React Query hook to fetch all products belonging to the authenticated seller.
// Calls GET /api/seller/products.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Shape of a product returned by the seller products endpoint */
export interface SellerProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  status: string; // e.g. "DRAFT", "ACTIVE"
  brand: string | null;
  categoryId: string;
  category?: { name: string }; // may be populated by the API
  images: { id: string; url: string; altText: string }[];
  variations: {
    id: string;
    sku: string;
    size: string | null;
    color: string | null;
    priceModifier: number;
    stockQty: number;
  }[];
  createdAt: string;
}

interface SellerProductsResponse {
  status: string;
  data: {
    products: SellerProduct[];
  };
}

/**
 * Fetch the authenticated seller's products.
 * The query key ['seller-products'] is used for cache invalidation
 * when a mutation creates, updates, or deletes a product.
 */
export function useSellerProducts(): UseQueryResult<SellerProductsResponse, Error> {
  return useQuery<SellerProductsResponse, Error>({
    queryKey: ['seller-products'],
    queryFn: async () => {
      const { data } = await apiClient.get<SellerProductsResponse>('/seller/products');
      return data;
    },
  });
}
