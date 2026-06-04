// admin-frontend/src/hooks/useAdminOrderDetail.ts
// Fetches a single order's full detail (admin view) by order ID.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

// ---------------------------------------------------------------------------
// Types – must match the backend's GET /api/admin/orders/:id response
// ---------------------------------------------------------------------------

export interface AdminOrderItemDetail {
  id: string;
  quantity: number;
  priceAtTime: string;
  product: {
    id: string;
    name: string;
    images: { url: string }[];
    seller: { storeName: string };
  };
  variation: {
    sku: string;
    size: string | null;
    color: string | null;
  } | null;
}

export interface AdminOrderDetail {
  id: string;
  customer: { name: string; email: string };
  status: string;
  totalAmount: string;
  createdAt: string;
  items: AdminOrderItemDetail[];
}

interface AdminOrderDetailResponse {
  status: string;
  data: { order: AdminOrderDetail };
}

/**
 * Fetch a single order detail by ID.
 * Only runs when `orderId` is provided.
 */
export function useAdminOrderDetail(
  orderId: string | null,
): UseQueryResult<AdminOrderDetailResponse, Error> {
  return useQuery<AdminOrderDetailResponse, Error>({
    queryKey: ['admin-order-detail', orderId],
    queryFn: async () => {
      const { data } = await apiClient.get<AdminOrderDetailResponse>(`/admin/orders/${orderId}`);
      return data;
    },
    enabled: !!orderId, // only run when an order ID is selected
    staleTime: 30 * 1000,
  });
}
