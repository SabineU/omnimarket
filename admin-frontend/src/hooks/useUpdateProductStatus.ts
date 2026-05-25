// admin-frontend/src/hooks/useUpdateProductStatus.ts
// Mutation hook to update a product's status (approve / reject).
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

interface UpdateProductStatusPayload {
  productId: string;
  status: string; // "ACTIVE" to approve, "INACTIVE" to reject
}

/**
 * Approve or reject a product.
 * On success, invalidates the admin-products query so the list refreshes.
 */
export function useUpdateProductStatus(): UseMutationResult<
  void,
  Error,
  UpdateProductStatusPayload
> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateProductStatusPayload>({
    mutationFn: async ({ productId, status }: UpdateProductStatusPayload) => {
      await apiClient.patch(`/admin/products/${productId}/status`, { status });
    },
    onSuccess: () => {
      toast.success('Product status updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update product status');
      console.error('Update product status error:', error);
    },
  });
}
