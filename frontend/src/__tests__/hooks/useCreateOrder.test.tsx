// frontend/src/__tests__/hooks/useCreateOrder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateOrder } from '../../hooks/useCreateOrder';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { post: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCreateOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a PaymentIntent and returns its data', async () => {
    const intentData = { clientSecret: 'cs_123', paymentIntentId: 'pi_123' };
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: intentData },
    });

    const { result } = renderHook(() => useCreateOrder(), { wrapper: createWrapper() });

    result.current.mutate({ addressId: 'addr1' });

    await waitFor(() => {
      expect(result.current.data).toEqual(intentData);
    });
  });

  it('handles error', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useCreateOrder(), { wrapper: createWrapper() });

    result.current.mutate({ addressId: 'addr1' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
