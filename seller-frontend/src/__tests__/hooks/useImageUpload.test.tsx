// seller-frontend/src/__tests__/hooks/useImageUpload.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useImageUpload } from '../../hooks/useImageUpload';
import { apiClient } from '../../lib/api-client';
import toast from 'react-hot-toast';

vi.mock('../../lib/api-client', () => ({ apiClient: { post: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads an image and returns URL', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { url: 'https://cloudinary.com/img.jpg' } },
    });

    const { result } = renderHook(() => useImageUpload(), { wrapper: createWrapper() });
    const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });

    result.current.mutate(file);

    await waitFor(() => {
      expect(result.current.data).toBe('https://cloudinary.com/img.jpg');
      expect(toast.success).toHaveBeenCalledWith('Image uploaded', { duration: 2000 });
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Upload failed'));

    const { result } = renderHook(() => useImageUpload(), { wrapper: createWrapper() });
    const file = new File(['dummy'], 'test.jpg');

    result.current.mutate(file);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Upload failed');
    });
  });
});
