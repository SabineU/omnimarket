// frontend/src/hooks/useCart.ts
// Fetches the authenticated user's cart items with product details.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useAuth } from './useAuth';

/** A single cart item returned by the API */
export interface CartItem {
  id: string;
  productId: string;
  variationId: string | null;
  quantity: number;
  productName: string;
  productImage: string | null;
  price: number;
  sellerId: string;
  sellerName: string;
  lineTotal: number;
}

interface CartResponse {
  status: string;
  data: {
    items: CartItem[];
  };
}

export function useCart(): UseQueryResult<CartResponse, Error> {
  const { user } = useAuth();

  return useQuery<CartResponse, Error>({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await apiClient.get<CartResponse>('/cart');
      return data;
    },
    // Only fetch when the user is logged in
    enabled: !!user,
  });
}
