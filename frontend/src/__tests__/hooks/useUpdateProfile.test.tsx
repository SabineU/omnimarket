// frontend/src/__tests__/hooks/useUpdateProfile.test.tsx
// Unit tests for the useUpdateProfile mutation hook.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';
import { apiClient } from '../../lib/api-client';
import toast from 'react-hot-toast';

vi.mock('../../lib/api-client', () => ({ apiClient: { put: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useUpdateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls PUT /users/me and shows success toast', async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { user: { id: 'u1', name: 'New Name' } } },
    });

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

    result.current.mutate({ name: 'New Name' });

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith('/users/me', { name: 'New Name' });
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() });

    result.current.mutate({ name: 'New Name' });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Update failed');
    });
  });
});
