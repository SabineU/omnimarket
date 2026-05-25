// admin-frontend/src/hooks/useAdminDashboard.ts
// React Query hook to fetch the admin dashboard summary.
// Calls GET /api/admin/dashboard/stats (restricted to ADMIN role).
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Shape of the dashboard data returned by the backend */
export interface AdminDashboardSummary {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalSellers: number;
  totalProducts: number;
  recentOrders: {
    id: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }[];
}

interface DashboardResponse {
  status: string;
  data: AdminDashboardSummary;
}

/**
 * Fetch the admin dashboard statistics.
 */
export function useAdminDashboard(): UseQueryResult<AdminDashboardSummary, Error> {
  return useQuery<AdminDashboardSummary, Error>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardResponse>('/admin/dashboard/stats');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
