// frontend/src/hooks/useUpdateProfile.ts
// Mutation hook for updating the current user's profile.
// Calls PUT /api/users/me and refetches user data on success.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

/** Payload for updating the profile */
export interface UpdateProfilePayload {
  name: string;
  avatarUrl?: string | null;
}

/** User object returned by the API */
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

interface UpdateProfileResponse {
  status: string;
  data: {
    user: User;
  };
}

/**
 * React Query mutation for updating the authenticated user's profile.
 *
 * On success, it invalidates the ['profile'] query and shows a toast.
 */
export function useUpdateProfile(): UseMutationResult<
  UpdateProfileResponse,
  Error,
  UpdateProfilePayload
> {
  const queryClient = useQueryClient();

  return useMutation<UpdateProfileResponse, Error, UpdateProfilePayload>({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const { data } = await apiClient.put<UpdateProfileResponse>('/users/me', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      // Refetch the profile data
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile');
      console.error('Update profile error:', error);
    },
  });
}
