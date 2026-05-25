// admin-frontend/src/hooks/useAdminUsers.ts
// React Query hook to fetch the list of users for the admin panel.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Shape of a user returned by the admin users endpoint */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string; // 'CUSTOMER' | 'SELLER' | 'ADMIN'
  isActive: boolean;
  createdAt: string;
}

export interface AdminUsersResponse {
  status: string;
  data: {
    users: AdminUser[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      limit: number;
    };
  };
}

/**
 * Fetch users with optional search, role filter, and pagination.
 */
export function useAdminUsers(params: {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}): UseQueryResult<AdminUsersResponse, Error> {
  return useQuery<AdminUsersResponse, Error>({
    queryKey: ['admin-users', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.set('search', params.search);
      if (params.role) queryParams.set('role', params.role);
      if (params.page) queryParams.set('page', String(params.page));
      if (params.limit) queryParams.set('limit', String(params.limit));

      const { data } = await apiClient.get<AdminUsersResponse>(
        `/admin/users?${queryParams.toString()}`,
      );
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
