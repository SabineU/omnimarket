// admin-frontend/src/__tests__/hooks/useDeleteUser.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteUser } from '../../hooks/useDeleteUser';
import { apiClient } from '../../lib/api-client';
import toast from 'react-hot-toast';

vi.mock('../../lib/api-client', () => ({ apiClient: { delete: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useDeleteUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends DELETE and shows success toast', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
    const { result } = renderHook(() => useDeleteUser(), { wrapper: createWrapper() });
    result.current.mutate('u1');
    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/users/u1');
      expect(toast.success).toHaveBeenCalledWith('User deleted successfully');
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Fail'));
    const { result } = renderHook(() => useDeleteUser(), { wrapper: createWrapper() });
    result.current.mutate('u1');
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fail');
    });
  });
});
