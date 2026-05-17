// frontend/src/hooks/useRemoveCartItem.ts
// Mutation hook for removing an item from the cart.
// Now shows a brief success toast when an item is removed.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

interface RemoveCartItemVariables {
  itemId: string;
}

export function useRemoveCartItem(): UseMutationResult<void, Error, RemoveCartItemVariables> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, RemoveCartItemVariables>({
    mutationFn: async ({ itemId }: RemoveCartItemVariables) => {
      await apiClient.delete(`/cart/items/${itemId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      // Brief feedback for item removal
      toast.success('Item removed', { duration: 1500 });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove item from cart');
      console.error('Failed to remove cart item:', error);
    },
  });
}
