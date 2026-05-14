// frontend/src/hooks/useCategories.ts
// Fetches the full category tree from the public API.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Shape of a single category node (includes children for tree) */
export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  children: CategoryNode[];
}

interface CategoriesResponse {
  status: string;
  data: {
    categories: CategoryNode[];
  };
}

/**
 * Hook that returns the complete category tree.
 * Cached for 5 minutes because categories rarely change.
 */
export function useCategories(): UseQueryResult<CategoriesResponse, Error> {
  return useQuery<CategoriesResponse, Error>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<CategoriesResponse>('/categories');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
