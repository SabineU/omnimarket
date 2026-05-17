// frontend/src/__tests__/hooks/useCompleteCheckout.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCompleteCheckout } from '../../hooks/useCompleteCheckout';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { post: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCompleteCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes checkout and returns order', async () => {
    const order = { id: 'o1', status: 'CONFIRMED', total: 20, createdAt: new Date().toISOString() };
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { order } },
    });

    const { result } = renderHook(() => useCompleteCheckout(), { wrapper: createWrapper() });

    result.current.mutate({ stripePaymentIntentId: 'pi_123' });

    await waitFor(() => {
      expect(result.current.data?.data?.order).toEqual(order);
    });
  });

  it('handles error', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Completion failed'),
    );

    const { result } = renderHook(() => useCompleteCheckout(), { wrapper: createWrapper() });

    result.current.mutate({ stripePaymentIntentId: 'pi_123' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
