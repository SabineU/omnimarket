// frontend/src/hooks/useDeleteAddress.ts
// Mutation hook for deleting a saved address.
// Calls DELETE /api/users/me/addresses/:id and refetches addresses on success.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

interface DeleteAddressResponse {
  status: string;
  message: string;
}

/**
 * React Query mutation for deleting a user's saved address.
 */
export function useDeleteAddress(): UseMutationResult<
  DeleteAddressResponse,
  Error,
  string // addressId
> {
  const queryClient = useQueryClient();

  return useMutation<DeleteAddressResponse, Error, string>({
    mutationFn: async (addressId: string) => {
      const { data } = await apiClient.delete<DeleteAddressResponse>(
        `/users/me/addresses/${addressId}`,
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Address deleted');
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete address');
      console.error('Delete address error:', error);
    },
  });
}
