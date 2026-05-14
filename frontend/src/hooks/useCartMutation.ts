// frontend/src/hooks/useCartMutation.ts
// Hook that provides the "add to cart" mutation.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface AddToCartVariables {
  productId: string;
  variationId?: string;
  quantity: number;
}

/**
 * Mutation that adds an item to the cart.
 * On success, it invalidates the 'cart' query so that any cart display refreshes.
 */
export function useAddToCart(): UseMutationResult<unknown, Error, AddToCartVariables> {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, AddToCartVariables>({
    mutationFn: async (item) => {
      const { data } = await apiClient.post('/cart/items', item);
      return data; // we don't use the exact shape, so unknown is fine
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
