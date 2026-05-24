// seller-frontend/src/__tests__/hooks/useProductMutations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../../hooks/useProductMutations';
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

describe('useProductMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a product and shows success toast', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { product: { id: 'p1' } } },
    });
    const { result } = renderHook(() => useCreateProduct(), { wrapper: createWrapper() });
    result.current.mutate({
      name: 'New',
      description: 'desc',
      categoryId: 'cat1',
      basePrice: 10,
      variations: [],
      images: [],
    });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Product created successfully');
    });
  });

  it('updates a product and shows success toast', async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { product: { id: 'p1' } } },
    });
    const { result } = renderHook(() => useUpdateProduct(), { wrapper: createWrapper() });
    result.current.mutate({ productId: 'p1', name: 'Updated' });

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Product updated');
    });
  });

  it('deletes a product and shows success toast', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
    const { result } = renderHook(() => useDeleteProduct(), { wrapper: createWrapper() });
    result.current.mutate('p1');

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/seller/products/p1');
      expect(toast.success).toHaveBeenCalledWith('Product deleted');
    });
  });
});
