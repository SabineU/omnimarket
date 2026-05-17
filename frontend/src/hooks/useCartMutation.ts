// frontend/src/hooks/useCartMutation.ts
// Mutation hook for adding an item to the shopping cart.
// Calls POST /api/cart/items and invalidates the cart query on success.
// Now uses toast notifications instead of alert().
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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
 * On error, it displays a toast notification with the error message.
 */
export function useCartMutation(): UseMutationResult<
  { status: string; data: unknown },
  Error,
  AddToCartPayload
> {
  const queryClient = useQueryClient();

  return useMutation<{ status: string; data: unknown }, Error, AddToCartPayload>({
    mutationFn: async (payload: AddToCartPayload) => {
      const { data } = await apiClient.post<{ status: string; data: unknown }>(
        '/cart/items',
        payload,
      );
      return data;
    },
    onSuccess: (_data) => {
      // Mark the cart query as stale so it refetches in the background
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      // Show a success toast (the component can also show its own toast,
      // but the hook provides a baseline notification)
      toast.success('Item added to cart!');
    },
    onError: (error) => {
      // Display a user‑friendly error toast
      toast.error(error.message || 'Failed to add item to cart');
      // Also log to console for debugging
      console.error('Failed to add item to cart:', error);
    },
  });
}
