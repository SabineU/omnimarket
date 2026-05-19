// frontend/src/__tests__/hooks/useUpdateAddress.test.tsx
// Unit tests for the useUpdateAddress mutation hook.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateAddress } from '../../hooks/useUpdateAddress';
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

describe('useUpdateAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls PATCH /users/me/addresses/:id and shows success toast', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { address: { id: 'a1', street: 'New St' } } },
    });

    const { result } = renderHook(() => useUpdateAddress(), { wrapper: createWrapper() });

    result.current.mutate({ addressId: 'a1', data: { street: 'New St' } });

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/users/me/addresses/a1', { street: 'New St' });
      expect(toast.success).toHaveBeenCalledWith('Address updated');
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Patch failed'));

    const { result } = renderHook(() => useUpdateAddress(), { wrapper: createWrapper() });

    result.current.mutate({ addressId: 'a1', data: { city: 'New City' } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Patch failed');
    });
  });
});
