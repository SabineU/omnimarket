// admin-frontend/src/hooks/useToggleUserActive.ts
// Mutation hook to activate / deactivate a user.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

interface ToggleActivePayload {
  userId: string;
  isActive: boolean;
}

export function useToggleUserActive(): UseMutationResult<void, Error, ToggleActivePayload> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ToggleActivePayload>({
    mutationFn: async ({ userId, isActive }: ToggleActivePayload) => {
      await apiClient.patch(`/admin/users/${userId}/active-status`, { isActive });
    },
    onSuccess: () => {
      toast.success('User status updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update user status');
      console.error('Toggle active error:', error);
    },
  });
}
