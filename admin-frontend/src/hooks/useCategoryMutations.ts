// admin-frontend/src/hooks/useCategoryMutations.ts
// Mutation hooks for creating, updating, and deleting categories.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateCategoryPayload {
  name: string;
  slug: string;
  parentId?: string | null;
  imageUrl?: string | null;
}

export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> {
  id: string;
}

interface CategoryResponse {
  status: string;
  data: {
    category: { id: string; name: string };
  };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Create a new category */
export function useCreateCategory(): UseMutationResult<
  CategoryResponse,
  Error,
  CreateCategoryPayload
> {
  const queryClient = useQueryClient();

  return useMutation<CategoryResponse, Error, CreateCategoryPayload>({
    mutationFn: async (payload: CreateCategoryPayload) => {
      const { data } = await apiClient.post<CategoryResponse>('/admin/categories', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Category created');
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create category');
      console.error('Create category error:', error);
    },
  });
}

/** Update an existing category */
export function useUpdateCategory(): UseMutationResult<
  CategoryResponse,
  Error,
  UpdateCategoryPayload
> {
  const queryClient = useQueryClient();

  return useMutation<CategoryResponse, Error, UpdateCategoryPayload>({
    mutationFn: async ({ id, ...payload }: UpdateCategoryPayload) => {
      const { data } = await apiClient.put<CategoryResponse>(`/admin/categories/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Category updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update category');
      console.error('Update category error:', error);
    },
  });
}

/** Delete a category by ID */
export function useDeleteCategory(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (categoryId: string) => {
      await apiClient.delete(`/admin/categories/${categoryId}`);
    },
    onSuccess: () => {
      toast.success('Category deleted');
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete category');
      console.error('Delete category error:', error);
    },
  });
}
