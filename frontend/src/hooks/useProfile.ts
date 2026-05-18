// frontend/src/hooks/useProfile.ts
// Fetches the current user's profile from GET /api/users/me.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** User profile fields */
export interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

interface ProfileResponse {
  status: string;
  data: {
    user: Profile;
  };
}

/**
 * React Query hook to fetch the authenticated user's profile.
 */
export function useProfile(): UseQueryResult<ProfileResponse, Error> {
  return useQuery<ProfileResponse, Error>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await apiClient.get<ProfileResponse>('/users/me');
      return data;
    },
  });
}
