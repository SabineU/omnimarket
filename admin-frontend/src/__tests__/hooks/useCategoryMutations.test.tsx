// admin-frontend/src/__tests__/hooks/useCategoryMutations.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../../hooks/useCategoryMutations';
import { apiClient } from '../../lib/api-client';
import toast from 'react-hot-toast';

vi.mock('../../lib/api-client', () => ({
  apiClient: { post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCategoryMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a category and shows success toast', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { category: { id: 'c1', name: 'New' } } },
    });
    const { result } = renderHook(() => useCreateCategory(), { wrapper: createWrapper() });
    result.current.mutate({ name: 'New', slug: 'new' });
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/admin/categories', {
        name: 'New',
        slug: 'new',
      });
      expect(toast.success).toHaveBeenCalledWith('Category created');
    });
  });

  it('updates a category and shows success toast', async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { category: { id: 'c1', name: 'Updated' } } },
    });
    const { result } = renderHook(() => useUpdateCategory(), { wrapper: createWrapper() });
    result.current.mutate({ id: 'c1', name: 'Updated' });
    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith('/admin/categories/c1', { name: 'Updated' });
      expect(toast.success).toHaveBeenCalledWith('Category updated');
    });
  });

  it('deletes a category and shows success toast', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
    const { result } = renderHook(() => useDeleteCategory(), { wrapper: createWrapper() });
    result.current.mutate('c1');
    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/categories/c1');
      expect(toast.success).toHaveBeenCalledWith('Category deleted');
    });
  });

  it('shows error toast on create failure', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Fail'));
    const { result } = renderHook(() => useCreateCategory(), { wrapper: createWrapper() });
    result.current.mutate({ name: 'Test', slug: 'test' });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fail');
    });
  });

  it('shows error toast on update failure', async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Fail'));
    const { result } = renderHook(() => useUpdateCategory(), { wrapper: createWrapper() });
    result.current.mutate({ id: 'c1', name: 'Updated' });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fail');
    });
  });

  it('shows error toast on delete failure', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Fail'));
    const { result } = renderHook(() => useDeleteCategory(), { wrapper: createWrapper() });
    result.current.mutate('c1');
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fail');
    });
  });
});
