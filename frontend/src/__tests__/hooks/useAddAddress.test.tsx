// frontend/src/__tests__/hooks/useAddAddress.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddAddress } from '../../hooks/useAddAddress';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { post: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAddAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts new address and returns it', async () => {
    const newAddress = {
      street: '456 Oak Ave',
      city: 'Townsville',
      state: 'TS',
      zipCode: '12345',
      country: 'US',
    };
    const address = { id: 'addr2', ...newAddress, isDefault: false };
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { address } },
    });

    const { result } = renderHook(() => useAddAddress(), { wrapper: createWrapper() });

    result.current.mutate(newAddress);

    await waitFor(() => {
      expect(result.current.data?.data?.address).toEqual(address);
    });
  });

  it('handles error', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Add failed'));

    const { result } = renderHook(() => useAddAddress(), { wrapper: createWrapper() });

    result.current.mutate({ street: '', city: '', state: '', zipCode: '', country: '' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
