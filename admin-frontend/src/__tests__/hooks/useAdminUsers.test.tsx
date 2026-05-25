// admin-frontend/src/__tests__/hooks/useAdminUsers.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches users with default params', async () => {
    const users = [
      {
        id: '1',
        email: 'test@test.com',
        name: 'Test',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { users, pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 } },
      },
    });

    const { result } = renderHook(() => useAdminUsers({}), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data?.data.users).toEqual(users);
    });
  });

  it('handles error', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useAdminUsers({}), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
