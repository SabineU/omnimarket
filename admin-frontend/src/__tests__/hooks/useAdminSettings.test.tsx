// admin-frontend/src/__tests__/hooks/useAdminSettings.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminSettings } from '../../hooks/useAdminSettings';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAdminSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches settings successfully', async () => {
    const settings = [{ id: '1', key: 'commissionRate', value: '10', updatedAt: '' }];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { settings } },
    });

    const { result } = renderHook(() => useAdminSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data?.data.settings).toEqual(settings);
    });
  });

  it('handles error', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useAdminSettings(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
