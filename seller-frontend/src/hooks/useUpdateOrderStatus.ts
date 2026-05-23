// seller-frontend/src/hooks/useUpdateOrderStatus.ts
// Mutation hook for updating an order's status (confirm, ship with tracking).
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

/** Payload sent to PATCH /seller/orders/:orderId/status */
export interface UpdateOrderStatusPayload {
  orderId: string;
  status: string; // "CONFIRMED" or "SHIPPED"
  trackingNumber?: string; // required when status is "SHIPPED"
}

interface OrderStatusResponse {
  status: string;
  data: {
    order: {
      id: string;
      status: string;
    };
  };
}

/**
 * Update the status of an order (confirm or ship).
 * On success, the seller-orders query is invalidated so the UI refetches.
 */
export function useUpdateOrderStatus(): UseMutationResult<
  OrderStatusResponse,
  Error,
  UpdateOrderStatusPayload
> {
  const queryClient = useQueryClient();

  return useMutation<OrderStatusResponse, Error, UpdateOrderStatusPayload>({
    mutationFn: async ({ orderId, status, trackingNumber }: UpdateOrderStatusPayload) => {
      const body: Record<string, string> = { status };
      if (trackingNumber) {
        body.trackingNumber = trackingNumber;
      }
      const { data } = await apiClient.patch<OrderStatusResponse>(
        `/seller/orders/${orderId}/status`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Order status updated');
      void queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update order status');
      console.error('Update order status error:', error);
    },
  });
}
