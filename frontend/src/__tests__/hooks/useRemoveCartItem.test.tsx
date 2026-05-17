// frontend/src/__tests__/hooks/useRemoveCartItem.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRemoveCartItem } from '../../hooks/useRemoveCartItem';
import { apiClient } from '../../lib/api-client';
import toast from 'react-hot-toast';

vi.mock('../../lib/api-client', () => ({ apiClient: { delete: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useRemoveCartItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls DELETE and shows success toast', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const { result } = renderHook(() => useRemoveCartItem(), { wrapper: createWrapper() });

    result.current.mutate({ itemId: 'i1' });

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/cart/items/i1');
      expect(toast.success).toHaveBeenCalledWith('Item removed', { duration: 1500 });
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Delete failed'),
    );

    const { result } = renderHook(() => useRemoveCartItem(), { wrapper: createWrapper() });

    result.current.mutate({ itemId: 'i1' });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Delete failed');
    });
  });
});
