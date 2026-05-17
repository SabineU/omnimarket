// frontend/src/__tests__/hooks/useCartMutation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCartMutation } from '../../hooks/useCartMutation';
import { apiClient } from '../../lib/api-client';
import toast from 'react-hot-toast';

vi.mock('../../lib/api-client', () => ({ apiClient: { post: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCartMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the API and shows success toast on mutation success', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: {} },
    });

    const { result } = renderHook(() => useCartMutation(), { wrapper: createWrapper() });

    result.current.mutate({ productId: 'p1', variationId: null, quantity: 1 });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/cart/items', {
        productId: 'p1',
        variationId: null,
        quantity: 1,
      });
      expect(toast.success).toHaveBeenCalledWith('Item added to cart!');
    });
  });

  it('shows error toast on mutation failure', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Add failed'));

    const { result } = renderHook(() => useCartMutation(), { wrapper: createWrapper() });

    result.current.mutate({ productId: 'p1', variationId: null, quantity: 1 });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Add failed');
    });
  });
});
