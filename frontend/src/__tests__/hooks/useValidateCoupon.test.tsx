// frontend/src/__tests__/hooks/useValidateCoupon.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useValidateCoupon } from '../../hooks/useValidateCoupon';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { post: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useValidateCoupon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns coupon data on valid code', async () => {
    const coupon = {
      code: 'SAVE10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minCartAmount: null,
    };
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { coupon } },
    });

    const { result } = renderHook(() => useValidateCoupon(), { wrapper: createWrapper() });

    result.current.mutate({ code: 'SAVE10' });

    await waitFor(() => {
      expect(result.current.data).toEqual(coupon);
    });
  });

  it('returns error on invalid code', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Invalid coupon'));

    const { result } = renderHook(() => useValidateCoupon(), { wrapper: createWrapper() });

    result.current.mutate({ code: 'INVALID' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe('Invalid coupon');
    });
  });
});
