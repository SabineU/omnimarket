// frontend/src/hooks/useRemoveCartItem.ts
// Mutation hook for removing an item from the cart.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface RemoveCartItemVariables {
  itemId: string;
}

/**
 * A React Query mutation hook that sends a DELETE request to
 * remove an item from the user’s cart.
 *
 * After deletion, the cart data is refetched by invalidating
 * the ['cart'] query key.
 *
 * @returns A mutation object that can be used to trigger the removal.
 */
export function useRemoveCartItem(): UseMutationResult<void, Error, RemoveCartItemVariables> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, RemoveCartItemVariables>({
    mutationFn: async ({ itemId }: RemoveCartItemVariables) => {
      // DELETE /cart/items/:itemId
      // We don’t need the response data.
      await apiClient.delete(`/cart/items/${itemId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
