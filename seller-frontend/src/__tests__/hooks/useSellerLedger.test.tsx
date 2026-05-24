// seller-frontend/src/__tests__/hooks/useSellerLedger.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSellerLedger } from '../../hooks/useSellerLedger';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useSellerLedger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches ledger successfully', async () => {
    const ledger = {
      totalEarned: 500,
      commissionRate: 10,
      totalCommission: 50,
      netEarnings: 450,
      pendingPayout: 450,
      transactions: [],
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: ledger },
    });

    const { result } = renderHook(() => useSellerLedger(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).toEqual(ledger);
    });
  });

  it('handles error', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useSellerLedger(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
