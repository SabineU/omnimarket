// frontend/src/__tests__/hooks/useUpdateCartItem.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateCartItem } from '../../hooks/useUpdateCartItem';
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

describe('useUpdateCartItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls PATCH and shows success toast', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const { result } = renderHook(() => useUpdateCartItem(), { wrapper: createWrapper() });

    result.current.mutate({ itemId: 'i1', quantity: 3 });

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/cart/items/i1', { quantity: 3 });
      expect(toast.success).toHaveBeenCalledWith('Quantity updated', { duration: 1500 });
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Patch failed'));

    const { result } = renderHook(() => useUpdateCartItem(), { wrapper: createWrapper() });

    result.current.mutate({ itemId: 'i1', quantity: 3 });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Patch failed');
    });
  });
});
