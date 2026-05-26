// admin-frontend/src/hooks/useCouponMutations.ts
// Mutation hooks for creating, updating, and deleting coupons.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateCouponPayload {
  code: string;
  discountType: string; // 'PERCENTAGE' or 'FIXED_AMOUNT'
  discountValue: number;
  minCartAmount?: number | null;
  usageLimit?: number | null;
  expiresAt?: string | null; // ISO date string
}

export interface UpdateCouponPayload extends Partial<CreateCouponPayload> {
  id: string;
}

interface CouponResponse {
  status: string;
  data: {
    coupon: { id: string; code: string };
  };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Create a new coupon */
export function useCreateCoupon(): UseMutationResult<CouponResponse, Error, CreateCouponPayload> {
  const queryClient = useQueryClient();

  return useMutation<CouponResponse, Error, CreateCouponPayload>({
    mutationFn: async (payload: CreateCouponPayload) => {
      const { data } = await apiClient.post<CouponResponse>('/admin/coupons', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Coupon created');
      void queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create coupon');
      console.error('Create coupon error:', error);
    },
  });
}

/** Update an existing coupon */
export function useUpdateCoupon(): UseMutationResult<CouponResponse, Error, UpdateCouponPayload> {
  const queryClient = useQueryClient();

  return useMutation<CouponResponse, Error, UpdateCouponPayload>({
    mutationFn: async ({ id, ...payload }: UpdateCouponPayload) => {
      const { data } = await apiClient.put<CouponResponse>(`/admin/coupons/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Coupon updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update coupon');
      console.error('Update coupon error:', error);
    },
  });
}

/** Delete a coupon by ID */
export function useDeleteCoupon(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (couponId: string) => {
      await apiClient.delete(`/admin/coupons/${couponId}`);
    },
    onSuccess: () => {
      toast.success('Coupon deleted');
      void queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete coupon');
      console.error('Delete coupon error:', error);
    },
  });
}
