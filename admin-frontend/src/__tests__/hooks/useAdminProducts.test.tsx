// admin-frontend/src/__tests__/hooks/useAdminProducts.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminProducts } from '../../hooks/useAdminProducts';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAdminProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches products with no params', async () => {
    const products = [{ id: '1', name: 'Test', status: 'PENDING' }];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { products, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });

    const { result } = renderHook(() => useAdminProducts(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data?.data.products).toEqual(products);
    });
  });

  it('handles error', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useAdminProducts(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
