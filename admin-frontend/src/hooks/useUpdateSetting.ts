// admin-frontend/src/hooks/useUpdateSetting.ts
// Mutation hook to update a single system setting.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

interface UpdateSettingPayload {
  key: string;
  value: string;
}

interface SettingResponse {
  status: string;
  data: {
    setting: { id: string; key: string; value: string };
  };
}

/**
 * Update a system setting.
 * On success, invalidates the admin-settings query and shows a toast.
 */
export function useUpdateSetting(): UseMutationResult<
  SettingResponse,
  Error,
  UpdateSettingPayload
> {
  const queryClient = useQueryClient();

  return useMutation<SettingResponse, Error, UpdateSettingPayload>({
    mutationFn: async (payload: UpdateSettingPayload) => {
      const { data } = await apiClient.put<SettingResponse>('/admin/settings', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Setting updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update setting');
      console.error('Update setting error:', error);
    },
  });
}
