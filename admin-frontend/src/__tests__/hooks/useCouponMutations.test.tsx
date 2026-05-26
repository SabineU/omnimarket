// admin-frontend/src/__tests__/hooks/useCouponMutations.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateCoupon, useUpdateCoupon, useDeleteCoupon } from '../../hooks/useCouponMutations';
import { apiClient } from '../../lib/api-client';
import toast from 'react-hot-toast';

vi.mock('../../lib/api-client', () => ({
  apiClient: { post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCouponMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Create ----
  it('creates a coupon and shows success toast', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { coupon: { id: 'c1', code: 'SAVE10' } } },
    });
    const { result } = renderHook(() => useCreateCoupon(), { wrapper: createWrapper() });
    result.current.mutate({ code: 'SAVE10', discountType: 'PERCENTAGE', discountValue: 10 });
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/admin/coupons', {
        code: 'SAVE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
      });
      expect(toast.success).toHaveBeenCalledWith('Coupon created');
    });
  });

  it('shows error toast on create failure', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Fail'));
    const { result } = renderHook(() => useCreateCoupon(), { wrapper: createWrapper() });
    result.current.mutate({ code: 'FAIL', discountType: 'PERCENTAGE', discountValue: 5 });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fail');
    });
  });

  // ---- Update ----
  it('updates a coupon and shows success toast', async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { status: 'success', data: { coupon: { id: 'c1', code: 'SAVE20' } } },
    });
    const { result } = renderHook(() => useUpdateCoupon(), { wrapper: createWrapper() });
    result.current.mutate({ id: 'c1', discountValue: 20 });
    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith('/admin/coupons/c1', { discountValue: 20 });
      expect(toast.success).toHaveBeenCalledWith('Coupon updated');
    });
  });

  it('shows error toast on update failure', async () => {
    (apiClient.put as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Update fail'));
    const { result } = renderHook(() => useUpdateCoupon(), { wrapper: createWrapper() });
    result.current.mutate({ id: 'c1', code: 'X' });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Update fail');
    });
  });

  // ---- Delete ----
  it('deletes a coupon and shows success toast', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
    const { result } = renderHook(() => useDeleteCoupon(), { wrapper: createWrapper() });
    result.current.mutate('c1');
    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/admin/coupons/c1');
      expect(toast.success).toHaveBeenCalledWith('Coupon deleted');
    });
  });

  it('shows error toast on delete failure', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Delete fail'));
    const { result } = renderHook(() => useDeleteCoupon(), { wrapper: createWrapper() });
    result.current.mutate('c1');
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Delete fail');
    });
  });
});
