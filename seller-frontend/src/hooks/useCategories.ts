// seller-frontend/src/hooks/useCategories.ts
// React Query hook to fetch all product categories.
// Used by the product form to populate a category dropdown.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Category shape returned by GET /api/categories */
export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: Category[];
}

interface CategoriesResponse {
  status: string;
  data: {
    categories: Category[];
  };
}

/**
 * Fetch the full category tree from the public endpoint.
 */
export function useCategories(): UseQueryResult<CategoriesResponse, Error> {
  return useQuery<CategoriesResponse, Error>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<CategoriesResponse>('/categories');
      return data;
    },
    // Categories rarely change, so keep them fresh for 10 minutes
    staleTime: 10 * 60 * 1000,
  });
}
