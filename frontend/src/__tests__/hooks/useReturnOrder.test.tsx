// frontend/src/__tests__/hooks/useReturnOrder.test.tsx
// Unit tests for the useReturnOrder mutation hook.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReturnOrder } from '../../hooks/useReturnOrder';
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

describe('useReturnOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls POST /orders/:id/return and shows success toast', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { order: { id: 'o1', status: 'RETURN_REQUESTED' } } },
    });

    const { result } = renderHook(() => useReturnOrder(), { wrapper: createWrapper() });

    result.current.mutate({ orderId: 'o1', reason: 'Broken' });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/orders/o1/return', { reason: 'Broken' });
      expect(toast.success).toHaveBeenCalledWith('Return request submitted successfully');
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Return failed'));

    const { result } = renderHook(() => useReturnOrder(), { wrapper: createWrapper() });

    result.current.mutate({ orderId: 'o1', reason: 'Broken' });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Return failed');
    });
  });
});
