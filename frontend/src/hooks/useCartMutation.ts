// frontend/src/hooks/useCartMutation.ts
// Mutation hook for adding an item to the shopping cart.
// Calls POST /api/cart/items and invalidates the cart query on success.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Payload sent to the backend when adding an item to the cart */
export interface AddToCartPayload {
  productId: string;
  variationId?: string | null;
  quantity: number;
}

/**
 * React Query mutation hook for adding a product to the cart.
 *
 * On success, it invalidates the ['cart'] query so that the
 * cart drawer, badge, and cart page all refetch automatically.
 */
export function useCartMutation(): UseMutationResult<
  { status: string; data: unknown },
  Error,
  AddToCartPayload
> {
  const queryClient = useQueryClient();

  return useMutation<{ status: string; data: unknown }, Error, AddToCartPayload>({
    mutationFn: async (payload: AddToCartPayload) => {
      // The backend expects POST /cart/items with the payload
      const { data } = await apiClient.post<{ status: string; data: unknown }>(
        '/cart/items',
        payload,
      );
      return data;
    },
    // Prefix the unused parameter with underscore to satisfy lint
    onSuccess: (_data) => {
      // Mark the cart query as stale so it refetches in the background
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error) => {
      // Only use console.error which is allowed by the project's lint rules
      console.error('Failed to add item to cart:', error);
    },
  });
}
