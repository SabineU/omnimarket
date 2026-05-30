// admin-frontend/src/hooks/useAdminSellers.ts
// React Query hook to fetch the list of sellers for the admin verification page.
// Calls GET /api/admin/sellers with optional search, approval filter, and pagination.

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

// ---------------------------------------------------------------------------
// Types – must match the backend's response shape
// ---------------------------------------------------------------------------

/** A single seller row in the verification table */
export interface AdminSeller {
  userId: string; // UUID of the seller's user account
  name: string; // Display name
  email: string; // Email address
  storeName: string; // Business/store name
  description: string | null; // Optional store description
  isApproved: boolean; // Whether admin has approved this seller
  commissionRate: number; // Platform commission percentage
  createdAt: string; // ISO date string
}

/** Pagination metadata returned by the backend */
export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

/** Full response shape from GET /api/admin/sellers */
export interface AdminSellersResponse {
  status: string;
  data: {
    sellers: AdminSeller[];
    pagination: Pagination;
  };
}

/** Query parameters accepted by the hook */
export interface AdminSellersParams {
  search?: string; // Search by name, email, or store name
  isApproved?: boolean; // Filter by approval status
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated, filterable list of sellers for the admin verification page.
 *
 * @param params - search, approval filter, page, limit
 * @returns React Query result with sellers and pagination metadata
 *
 * Usage:
 *   const { data, isLoading } = useAdminSellers({ isApproved: false, page: 1 });
 */
export function useAdminSellers(
  params: AdminSellersParams = {},
): UseQueryResult<AdminSellersResponse, Error> {
  return useQuery<AdminSellersResponse, Error>({
    // The query key includes all params so React Query caches each combination separately
    queryKey: ['admin-sellers', params],

    queryFn: async () => {
      // Build query string from params
      const queryParams = new URLSearchParams();

      if (params.search) queryParams.set('search', params.search);
      // Only add isApproved if explicitly set (avoid sending 'undefined')
      if (params.isApproved !== undefined) {
        queryParams.set('isApproved', String(params.isApproved));
      }
      if (params.page) queryParams.set('page', String(params.page));
      if (params.limit) queryParams.set('limit', String(params.limit));

      // Call the backend endpoint
      const { data } = await apiClient.get<AdminSellersResponse>(
        `/admin/sellers?${queryParams.toString()}`,
      );
      return data;
    },

    // Keep data fresh for 2 minutes – sellers list doesn't change every second
    staleTime: 2 * 60 * 1000,
  });
}
