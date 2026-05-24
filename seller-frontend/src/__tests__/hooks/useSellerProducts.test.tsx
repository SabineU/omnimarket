// seller-frontend/src/__tests__/hooks/useSellerProducts.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSellerProducts } from '../../hooks/useSellerProducts';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useSellerProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches products successfully', async () => {
    const products = [{ id: '1', name: 'Test', status: 'ACTIVE' }];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { products } },
    });

    const { result } = renderHook(() => useSellerProducts(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data?.data.products).toEqual(products);
    });
  });

  it('handles error', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSellerProducts(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
