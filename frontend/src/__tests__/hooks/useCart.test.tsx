// frontend/src/__tests__/hooks/useCart.test.ts
// Unit tests for the useCart hook.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/api-client';

// Mocks
vi.mock('../../lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Provide a minimal QueryClient wrapper
function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch when user is not logged in', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });
    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('fetches the cart successfully when user is logged in', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '1', email: 'test@test.com', name: 'Test', role: 'customer' },
    });
    const mockData = {
      status: 'success',
      data: {
        items: [
          {
            id: 'item1',
            productId: 'p1',
            variationId: null,
            quantity: 2,
            productName: 'Test Product',
            productImage: null,
            price: 10,
            sellerId: 's1',
            sellerName: 'Seller',
            lineTotal: 20,
          },
        ],
      },
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('handles API error', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '1', email: 'test@test.com', name: 'Test', role: 'customer' },
    });
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });
});
