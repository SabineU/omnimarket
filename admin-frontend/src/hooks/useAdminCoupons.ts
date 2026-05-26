// admin-frontend/src/hooks/useAdminCoupons.ts
// React Query hook to fetch all coupons for the admin panel.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Shape of a coupon returned by the admin coupons endpoint */
export interface AdminCoupon {
  id: string;
  code: string;
  discountType: string; // 'PERCENTAGE' or 'FIXED_AMOUNT'
  discountValue: number;
  minCartAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null; // ISO date string
  createdAt: string;
}

interface CouponsResponse {
  status: string;
  data: {
    coupons: AdminCoupon[];
  };
}

/**
 * Fetch all coupons (admin view).
 * Query key ['admin-coupons'] is invalidated after mutations.
 */
export function useAdminCoupons(): UseQueryResult<CouponsResponse, Error> {
  return useQuery<CouponsResponse, Error>({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data } = await apiClient.get<CouponsResponse>('/admin/coupons');
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}
