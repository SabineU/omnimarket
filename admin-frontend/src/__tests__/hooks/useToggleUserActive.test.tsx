// admin-frontend/src/__tests__/hooks/useToggleUserActive.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useToggleUserActive } from '../../hooks/useToggleUserActive';
import { apiClient } from '../../lib/api-client';
import toast from 'react-hot-toast';

vi.mock('../../lib/api-client', () => ({ apiClient: { patch: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useToggleUserActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends PATCH and shows success toast', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
    const { result } = renderHook(() => useToggleUserActive(), { wrapper: createWrapper() });
    result.current.mutate({ userId: 'u1', isActive: false });
    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/u1/active-status', {
        isActive: false,
      });
      expect(toast.success).toHaveBeenCalledWith('User status updated');
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Fail'));
    const { result } = renderHook(() => useToggleUserActive(), { wrapper: createWrapper() });
    result.current.mutate({ userId: 'u1', isActive: true });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fail');
    });
  });
});
