// seller-frontend/src/hooks/useSellerDashboard.ts
// React Query hook to fetch the seller dashboard summary.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Shape of the dashboard data returned by the API */
export interface DashboardSummary {
  todaySales: number;
  pendingOrders: number;
  totalProducts: number;
  totalReviews: number;
  averageRating: number;
}

interface DashboardResponse {
  status: string;
  data: DashboardSummary;
}

/**
 * Fetch the seller's dashboard summary from GET /seller/dashboard.
 */
export function useSellerDashboard(): UseQueryResult<DashboardSummary, Error> {
  return useQuery<DashboardSummary, Error>({
    queryKey: ['seller-dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardResponse>('/seller/dashboard');
      return data.data;
    },
    // Refetch every 5 minutes to keep the dashboard fresh
    staleTime: 5 * 60 * 1000,
  });
}
