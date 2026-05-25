// admin-frontend/src/__tests__/hooks/useAdminCategories.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminCategories } from '../../hooks/useAdminCategories';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAdminCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches categories successfully', async () => {
    const categories = [{ id: '1', name: 'Electronics', slug: 'electronics', parentId: null }];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { categories } },
    });

    const { result } = renderHook(() => useAdminCategories(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data?.data.categories).toEqual(categories);
    });
  });

  it('handles error', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useAdminCategories(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
