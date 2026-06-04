// frontend/src/hooks/useMarkDelivered.ts
// Mutation hook for marking a shipped order as delivered (customer confirms receipt).
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

interface MarkDeliveredResponse {
  status: string;
  data: { order: { id: string; status: string } };
}

/**
 * Mutation hook that sends PATCH /api/orders/:id/deliver
 * and invalidates the order queries so the UI updates automatically.
 */
export function useMarkDelivered(): UseMutationResult<
  MarkDeliveredResponse,
  Error,
  string // orderId
> {
  const queryClient = useQueryClient();

  return useMutation<MarkDeliveredResponse, Error, string>({
    mutationFn: async (orderId: string) => {
      const { data } = await apiClient.patch<MarkDeliveredResponse>(`/orders/${orderId}/deliver`);
      return data;
    },
    onSuccess: (_data, orderId) => {
      toast.success('Order marked as delivered!');
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark as delivered');
      console.error('Mark delivered error:', error);
    },
  });
}
