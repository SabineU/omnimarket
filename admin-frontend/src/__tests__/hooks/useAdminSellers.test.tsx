// admin-frontend/src/__tests__/hooks/useAdminSellers.test.tsx
// Unit tests for the useAdminSellers hook.
// Verifies successful data fetching, error handling, and query parameter passing.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminSellers } from '../../hooks/useAdminSellers';
import { apiClient } from '../../lib/api-client';

// Mock the API client – we don't want real network calls in unit tests
vi.mock('../../lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

/**
 * Wrapper component that provides a fresh QueryClient for each test.
 * This isolates tests from each other – no shared cache between tests.
 */
function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed queries in tests
      },
    },
  });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAdminSellers', () => {
  // Clear all mocks before each test so tests don't interfere with each other
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches sellers successfully with default params', async () => {
    // Arrange: mock the API response
    const mockSellers = [
      {
        userId: 'seller-1',
        name: 'Bob Seller',
        email: 'bob@test.com',
        storeName: 'Bob Store',
        description: 'Best store',
        isApproved: false,
        commissionRate: 10,
        createdAt: '2026-05-01T00:00:00.000Z',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          sellers: mockSellers,
          pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 10 },
        },
      },
    });

    // Act: render the hook
    const { result } = renderHook(() => useAdminSellers(), { wrapper: createWrapper() });

    // Assert: wait for the query to resolve and check the data
    await waitFor(() => {
      expect(result.current.data?.data.sellers).toEqual(mockSellers);
    });

    // Verify the correct endpoint was called
    expect(apiClient.get).toHaveBeenCalledWith('/admin/sellers?');
  });

  it('passes search and isApproved params to the API', async () => {
    // Arrange
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          sellers: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 10 },
        },
      },
    });

    // Act: call with search and approval filter
    const { result } = renderHook(
      () => useAdminSellers({ search: 'bob', isApproved: false, page: 2, limit: 5 }),
      { wrapper: createWrapper() },
    );

    // Wait for the query to resolve
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Assert: the API was called with the correct query string
    const calledUrl = (apiClient.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('search=bob');
    expect(calledUrl).toContain('isApproved=false');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('limit=5');
  });

  it('handles API error gracefully', async () => {
    // Arrange: the API call rejects with an error
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    // Act
    const { result } = renderHook(() => useAdminSellers(), { wrapper: createWrapper() });

    // Assert: the hook should surface the error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe('Network error');
    });
  });

  it('returns empty array when no sellers exist', async () => {
    // Arrange
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          sellers: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 10 },
        },
      },
    });

    // Act
    const { result } = renderHook(() => useAdminSellers(), { wrapper: createWrapper() });

    // Assert
    await waitFor(() => {
      expect(result.current.data?.data.sellers).toEqual([]);
      expect(result.current.data?.data.pagination.totalItems).toBe(0);
    });
  });
});
