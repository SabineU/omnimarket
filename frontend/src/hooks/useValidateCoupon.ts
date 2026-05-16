// frontend/src/hooks/useValidateCoupon.ts
// Mutation hook for validating a coupon code against the backend.
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Shape of the coupon object returned by the backend when a code is valid */
export interface ValidCoupon {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minCartAmount: number | null;
}

interface ValidateCouponVariables {
  code: string;
}

/**
 * A React Query mutation hook that sends a coupon code to the
 * backend for validation.
 *
 * It returns a mutation object.  Call `.mutate({ code })` to trigger
 * validation.  Use the `onSuccess` callback in your component to
 * store the validated coupon so the discount can be displayed.
 *
 * @returns A mutation object that, when called, validates a coupon code.
 */
export function useValidateCoupon(): UseMutationResult<
  ValidCoupon,
  Error,
  ValidateCouponVariables
> {
  return useMutation<ValidCoupon, Error, ValidateCouponVariables>({
    mutationFn: async ({ code }: ValidateCouponVariables) => {
      // POST /cart/validate-coupon with { code }
      // The API returns { status: 'success', data: { coupon } }
      const { data } = await apiClient.post<{
        status: string;
        data: { coupon: ValidCoupon };
      }>('/cart/validate-coupon', { code });
      return data.data.coupon;
    },
  });
}
