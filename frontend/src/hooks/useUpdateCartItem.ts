// frontend/src/hooks/useUpdateCartItem.ts
// Mutation hook for updating the quantity of a cart item.
// Now shows a brief success toast when the quantity is changed.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

interface UpdateCartItemVariables {
  itemId: string;
  quantity: number;
}

export function useUpdateCartItem(): UseMutationResult<void, Error, UpdateCartItemVariables> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateCartItemVariables>({
    mutationFn: async ({ itemId, quantity }: UpdateCartItemVariables) => {
      await apiClient.patch(`/cart/items/${itemId}`, { quantity });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      // Brief, non‑intrusive feedback so the user knows the action succeeded
      toast.success('Quantity updated', { duration: 1500 });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update item quantity');
      console.error('Failed to update cart item:', error);
    },
  });
}
