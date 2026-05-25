// admin-frontend/src/hooks/useAdminCategories.ts
// React Query hook to fetch all categories for the admin panel.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Shape of a category returned by the admin endpoint */
export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: AdminCategory[];
}

interface CategoriesResponse {
  status: string;
  data: {
    categories: AdminCategory[];
  };
}

/**
 * Fetch all categories (admin view).
 * The query key ['admin-categories'] is invalidated after mutations.
 */
export function useAdminCategories(): UseQueryResult<CategoriesResponse, Error> {
  return useQuery<CategoriesResponse, Error>({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<CategoriesResponse>('/admin/categories');
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}
