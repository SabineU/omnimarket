// frontend/src/__tests__/hooks/useSubmitReview.test.tsx
// Unit tests for the useSubmitReview mutation hook.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubmitReview } from '../../hooks/useSubmitReview';
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

describe('useSubmitReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts to the standard review endpoint for a first review', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { review: { id: 'r1' } } },
    });

    const { result } = renderHook(() => useSubmitReview(), { wrapper: createWrapper() });

    result.current.mutate({ productId: 'p1', rating: 5, comment: 'Great', isAdditional: false });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/products/p1/reviews', {
        rating: 5,
        comment: 'Great',
      });
      expect(toast.success).toHaveBeenCalledWith('Review submitted – thank you!');
    });
  });

  it('posts to the additional review endpoint when isAdditional is true', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { review: { id: 'r2' } } },
    });

    const { result } = renderHook(() => useSubmitReview(), { wrapper: createWrapper() });

    result.current.mutate({ productId: 'p1', rating: 4, comment: 'Update', isAdditional: true });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/products/p1/reviews/additional', {
        rating: 4,
        comment: 'Update',
      });
    });
  });

  it('shows error toast on failure', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Review failed'));

    const { result } = renderHook(() => useSubmitReview(), { wrapper: createWrapper() });

    result.current.mutate({ productId: 'p1', rating: 5, comment: '' });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Review failed');
    });
  });
});
