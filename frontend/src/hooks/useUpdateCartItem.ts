// frontend/src/hooks/useUpdateCartItem.ts
// Mutation hook for updating the quantity of a cart item.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface UpdateCartItemVariables {
  itemId: string;
  quantity: number;
}

/**
 * A React Query mutation hook that sends a PATCH request to update
 * the quantity of a single cart item.
 *
 * On success, it invalidates the ['cart'] query so that the cart
 * data is automatically refetched and the UI updates.
 *
 * @returns A mutation object that can be used to trigger the update.
 */
export function useUpdateCartItem(): UseMutationResult<void, Error, UpdateCartItemVariables> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateCartItemVariables>({
    mutationFn: async ({ itemId, quantity }: UpdateCartItemVariables) => {
      // PATCH /cart/items/:itemId with { quantity }
      // We don’t need the response data, just send the request.
      await apiClient.patch(`/cart/items/${itemId}`, { quantity });
    },
    // After a successful update, mark the cart query as stale
    // so it refetches in the background.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
