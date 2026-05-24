// seller-frontend/src/__tests__/hooks/useUpdateOrderStatus.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateOrderStatus } from '../../hooks/useUpdateOrderStatus';
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

describe('useUpdateOrderStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends PATCH and shows success toast', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { order: { id: 'o1', status: 'CONFIRMED' } } },
    });

    const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper: createWrapper() });

    result.current.mutate({ orderId: 'o1', status: 'CONFIRMED' });

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/seller/orders/o1/status', {
        status: 'CONFIRMED',
      });
      expect(toast.success).toHaveBeenCalledWith('Order status updated');
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper: createWrapper() });

    result.current.mutate({ orderId: 'o1', status: 'SHIPPED', trackingNumber: '123' });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Update failed');
    });
  });
});
