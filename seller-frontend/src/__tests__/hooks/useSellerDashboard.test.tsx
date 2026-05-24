// seller-frontend/src/__tests__/hooks/useSellerDashboard.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSellerDashboard } from '../../hooks/useSellerDashboard';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useSellerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches dashboard summary', async () => {
    const summary = {
      todaySales: 100,
      pendingOrders: 2,
      totalProducts: 5,
      totalReviews: 8,
      averageRating: 4.5,
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: summary },
    });

    const { result } = renderHook(() => useSellerDashboard(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).toEqual(summary);
    });
  });

  it('handles error', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));
    const { result } = renderHook(() => useSellerDashboard(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
