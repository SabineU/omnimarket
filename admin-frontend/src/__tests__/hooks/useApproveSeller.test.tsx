// admin-frontend/src/__tests__/hooks/useApproveSeller.test.tsx
// Unit tests for the useApproveSeller mutation hook.
// Tests approve, reject (revoke), and error handling.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApproveSeller } from '../../hooks/useApproveSeller';
import { apiClient } from '../../lib/api-client';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../../lib/api-client', () => ({ apiClient: { patch: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useApproveSeller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('approves a seller and shows success toast', async () => {
    // Arrange: mock a successful API response
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { profile: { userId: 'seller-1', isApproved: true, storeName: 'Test Store' } },
      },
    });

    // Act: render the hook and trigger the mutation
    const { result } = renderHook(() => useApproveSeller(), { wrapper: createWrapper() });
    result.current.mutate({ userId: 'seller-1', isApproved: true });

    // Assert: wait for the mutation to complete
    await waitFor(() => {
      // Verify the API was called with the correct parameters
      expect(apiClient.patch).toHaveBeenCalledWith('/admin/sellers/seller-1', {
        isApproved: true,
      });
      // Verify the success toast was shown
      expect(toast.success).toHaveBeenCalledWith('Seller approved successfully');
    });
  });

  it('rejects (revokes) a seller and shows success toast', async () => {
    // Arrange
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: { profile: { userId: 'seller-2', isApproved: false, storeName: 'Bad Store' } },
      },
    });

    // Act
    const { result } = renderHook(() => useApproveSeller(), { wrapper: createWrapper() });
    result.current.mutate({ userId: 'seller-2', isApproved: false });

    // Assert
    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/admin/sellers/seller-2', {
        isApproved: false,
      });
      expect(toast.success).toHaveBeenCalledWith('Seller rejected successfully');
    });
  });

  it('shows error toast when the API call fails', async () => {
    // Arrange: the API rejects with an error
    (apiClient.patch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network failure'),
    );

    // Act
    const { result } = renderHook(() => useApproveSeller(), { wrapper: createWrapper() });
    result.current.mutate({ userId: 'seller-1', isApproved: true });

    // Assert
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network failure');
    });
  });

  it('shows a fallback error message when error has no message', async () => {
    // Arrange: reject with an error object that has no .message property
    (apiClient.patch as ReturnType<typeof vi.fn>).mockRejectedValueOnce({});

    // Act
    const { result } = renderHook(() => useApproveSeller(), { wrapper: createWrapper() });
    result.current.mutate({ userId: 'seller-1', isApproved: false });

    // Assert: the fallback message should be shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update seller status');
    });
  });
});
