// frontend/src/__tests__/hooks/useAddresses.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddresses } from '../../hooks/useAddresses';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAddresses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches addresses successfully', async () => {
    const addresses = [
      {
        id: 'a1',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '90210',
        country: 'US',
        isDefault: true,
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { addresses } },
    });

    const { result } = renderHook(() => useAddresses(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data?.data?.addresses).toEqual(addresses);
    });
  });

  it('handles error', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAddresses(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
