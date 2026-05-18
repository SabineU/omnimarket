// frontend/src/hooks/useReturnOrder.ts
// Mutation hook for submitting a return/refund request.
// Calls POST /api/orders/:id/return with a reason and refetches order data on success.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

/** Payload sent to the backend to request a return */
export interface ReturnOrderPayload {
  orderId: string;
  reason: string;
}

/** Minimal order shape returned after return request */
interface ReturnedOrder {
  id: string;
  status: string;
}

interface ReturnOrderResponse {
  status: string;
  data: {
    order: ReturnedOrder;
  };
}

/**
 * React Query mutation for submitting a return request.
 *
 * Only orders with status DELIVERED are eligible.
 * On success the ['order', orderId] and ['orders'] queries are
 * invalidated so the UI reflects the new RETURN_REQUESTED status.
 */
export function useReturnOrder(): UseMutationResult<
  ReturnOrderResponse,
  Error,
  ReturnOrderPayload
> {
  const queryClient = useQueryClient();

  return useMutation<ReturnOrderResponse, Error, ReturnOrderPayload>({
    mutationFn: async (payload: ReturnOrderPayload) => {
      // POST /api/orders/:id/return with { reason }
      const { data } = await apiClient.post<ReturnOrderResponse>(
        `/orders/${payload.orderId}/return`,
        { reason: payload.reason },
      );
      return data;
    },
    onSuccess: (data, variables) => {
      // Show a success toast so the user knows the request was submitted
      toast.success('Return request submitted successfully');

      // Invalidate the specific order detail query so it refetches
      void queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });

      // Invalidate the order list so the history page updates too
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      // Display the backend's error message
      toast.error(error.message || 'Failed to submit return request');
      console.error('Return request error:', error);
    },
  });
}
