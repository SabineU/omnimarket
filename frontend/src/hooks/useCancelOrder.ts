// frontend/src/hooks/useCancelOrder.ts
// Mutation hook for cancelling an order (customer side).
// Calls PATCH /api/orders/:id/cancel and refetches order data on success.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

/** Minimal order shape returned after cancellation */
interface CancelledOrder {
  id: string;
  status: string;
}

interface CancelOrderResponse {
  status: string;
  data: {
    order: CancelledOrder;
  };
}

/**
 * React Query mutation for cancelling a customer's order.
 *
 * Only orders with status PENDING or CONFIRMED can be cancelled.
 * On success the ['order', orderId] and ['orders'] queries are
 * invalidated so the UI reflects the new CANCELLED status.
 */
export function useCancelOrder(): UseMutationResult<
  CancelOrderResponse,
  Error,
  string // orderId
> {
  const queryClient = useQueryClient();

  return useMutation<CancelOrderResponse, Error, string>({
    mutationFn: async (orderId: string) => {
      // PATCH /api/orders/:id/cancel — no request body needed
      const { data } = await apiClient.patch<CancelOrderResponse>(`/orders/${orderId}/cancel`);
      return data;
    },
    onSuccess: (data, orderId) => {
      // Show a success toast so the user knows the action succeeded
      toast.success('Order cancelled successfully');

      // Invalidate the specific order detail query so it refetches
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] });

      // Invalidate the order list so the history page updates too
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      // Display the backend's error message (e.g. "Order cannot be cancelled")
      toast.error(error.message || 'Failed to cancel order');
      console.error('Cancel order error:', error);
    },
  });
}
