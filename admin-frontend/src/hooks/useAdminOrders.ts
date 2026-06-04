// admin-frontend/src/hooks/useAdminOrders.ts
// React Query hook to fetch all platform orders for the admin panel.
// Supports status filter and pagination via query parameters.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

// ---------------------------------------------------------------------------
// Types matching the backend's GET /api/admin/orders response
// ---------------------------------------------------------------------------

/** A single order as returned by the admin list endpoint */
export interface AdminOrder {
  id: string;
  customer: { name: string; email: string };
  status: string; // e.g. "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"
  totalAmount: string; // stored as string to preserve precision
  createdAt: string; // ISO date string
}

export interface AdminOrdersResponse {
  status: string;
  data: {
    orders: AdminOrder[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      limit: number;
    };
  };
}

/** Parameters accepted by the hook */
export interface AdminOrdersParams {
  status?: string; // optional: "CONFIRMED", "SHIPPED", etc.
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated, filterable list of all orders for the admin panel.
 */
export function useAdminOrders(
  params: AdminOrdersParams = {},
): UseQueryResult<AdminOrdersResponse, Error> {
  return useQuery<AdminOrdersResponse, Error>({
    queryKey: ['admin-orders', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.set('status', params.status);
      if (params.page) queryParams.set('page', String(params.page));
      if (params.limit) queryParams.set('limit', String(params.limit));

      const { data } = await apiClient.get<AdminOrdersResponse>(
        `/admin/orders?${queryParams.toString()}`,
      );
      return data;
    },
    // Refetch every 30 seconds to keep order statuses up‑to‑date
    staleTime: 30 * 1000,
  });
}
