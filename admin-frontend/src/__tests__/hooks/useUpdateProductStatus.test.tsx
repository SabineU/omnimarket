// admin-frontend/src/__tests__/hooks/useUpdateProductStatus.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateProductStatus } from '../../hooks/useUpdateProductStatus';
import { apiClient } from '../../lib/api-client';
import toast from 'react-hot-toast';

vi.mock('../../lib/api-client', () => ({ apiClient: { patch: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useUpdateProductStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('approves a product and shows success toast', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
    const { result } = renderHook(() => useUpdateProductStatus(), { wrapper: createWrapper() });
    result.current.mutate({ productId: 'p1', status: 'ACTIVE' });
    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/admin/products/p1/status', {
        status: 'ACTIVE',
      });
      expect(toast.success).toHaveBeenCalledWith('Product status updated');
    });
  });

  it('rejects a product and shows success toast', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
    const { result } = renderHook(() => useUpdateProductStatus(), { wrapper: createWrapper() });
    result.current.mutate({ productId: 'p2', status: 'INACTIVE' });
    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/admin/products/p2/status', {
        status: 'INACTIVE',
      });
      expect(toast.success).toHaveBeenCalledWith('Product status updated');
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Fail'));
    const { result } = renderHook(() => useUpdateProductStatus(), { wrapper: createWrapper() });
    result.current.mutate({ productId: 'p1', status: 'ACTIVE' });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fail');
    });
  });
});
