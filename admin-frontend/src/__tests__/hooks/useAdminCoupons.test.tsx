// admin-frontend/src/__tests__/hooks/useAdminCoupons.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminCoupons } from '../../hooks/useAdminCoupons';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAdminCoupons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches coupons successfully', async () => {
    const coupons = [{ id: '1', code: 'SAVE10', discountType: 'PERCENTAGE', discountValue: 10 }];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { coupons } },
    });

    const { result } = renderHook(() => useAdminCoupons(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data?.data.coupons).toEqual(coupons);
    });
  });

  it('handles error', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useAdminCoupons(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
