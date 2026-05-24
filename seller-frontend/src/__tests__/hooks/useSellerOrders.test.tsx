// seller-frontend/src/__tests__/hooks/useSellerOrders.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSellerOrders } from '../../hooks/useSellerOrders';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useSellerOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches orders successfully', async () => {
    const orders = [{ id: 'o1', status: 'CONFIRMED', items: [], customer: { name: 'John' } }];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { orders } },
    });

    const { result } = renderHook(() => useSellerOrders(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data?.data.orders).toEqual(orders);
    });
  });

  it('handles error', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSellerOrders(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
