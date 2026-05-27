// admin-frontend/src/hooks/useAdminSettings.ts
// React Query hook to fetch all system settings (key‑value pairs).
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** A single system setting */
export interface AdminSetting {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

interface SettingsResponse {
  status: string;
  data: {
    settings: AdminSetting[];
  };
}

/**
 * Fetch the full list of system settings.
 * Query key ['admin-settings'] is invalidated after a successful update.
 */
export function useAdminSettings(): UseQueryResult<SettingsResponse, Error> {
  return useQuery<SettingsResponse, Error>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await apiClient.get<SettingsResponse>('/admin/settings');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes – settings rarely change
  });
}
