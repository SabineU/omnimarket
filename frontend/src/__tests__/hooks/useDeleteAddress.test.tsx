// frontend/src/__tests__/hooks/useDeleteAddress.test.tsx
// Unit tests for the useDeleteAddress mutation hook.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteAddress } from '../../hooks/useDeleteAddress';
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

describe('useDeleteAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls DELETE /users/me/addresses/:id and shows success toast', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', message: 'Deleted' },
    });

    const { result } = renderHook(() => useDeleteAddress(), { wrapper: createWrapper() });

    result.current.mutate('a1');

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/users/me/addresses/a1');
      expect(toast.success).toHaveBeenCalledWith('Address deleted');
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Delete failed'),
    );

    const { result } = renderHook(() => useDeleteAddress(), { wrapper: createWrapper() });

    result.current.mutate('a1');

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Delete failed');
    });
  });
});
