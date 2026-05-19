// frontend/src/__tests__/hooks/useCancelOrder.test.tsx
// Unit tests for the useCancelOrder mutation hook.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCancelOrder } from '../../hooks/useCancelOrder';
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

describe('useCancelOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls PATCH /orders/:id/cancel and shows success toast', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { order: { id: 'o1', status: 'CANCELLED' } } },
    });

    const { result } = renderHook(() => useCancelOrder(), { wrapper: createWrapper() });

    result.current.mutate('o1');

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/orders/o1/cancel');
      expect(toast.success).toHaveBeenCalledWith('Order cancelled successfully');
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Cancel failed'));

    const { result } = renderHook(() => useCancelOrder(), { wrapper: createWrapper() });

    result.current.mutate('o1');

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Cancel failed');
    });
  });
});
