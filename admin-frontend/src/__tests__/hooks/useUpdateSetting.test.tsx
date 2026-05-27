// admin-frontend/src/__tests__/hooks/useUpdateSetting.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateSetting } from '../../hooks/useUpdateSetting';
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

describe('useUpdateSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends PUT and shows success toast', async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { setting: { id: '1', key: 'taxRate', value: '5' } } },
    });
    const { result } = renderHook(() => useUpdateSetting(), { wrapper: createWrapper() });
    result.current.mutate({ key: 'taxRate', value: '5' });

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith('/admin/settings', { key: 'taxRate', value: '5' });
      expect(toast.success).toHaveBeenCalledWith('Setting updated');
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Fail'));
    const { result } = renderHook(() => useUpdateSetting(), { wrapper: createWrapper() });
    result.current.mutate({ key: 'taxRate', value: '5' });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fail');
    });
  });
});
