// seller-frontend/src/hooks/useSellerLedger.ts
// React Query hook to fetch the seller's ledger (earnings & transactions).
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** A single transaction row */
export interface LedgerTransaction {
  orderId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  orderStatus: string;
  createdAt: string; // ISO date
}

/** Full ledger summary returned by the backend */
export interface SellerLedger {
  totalEarned: number;
  commissionRate: number;
  totalCommission: number;
  netEarnings: number;
  pendingPayout: number;
  transactions: LedgerTransaction[];
}

interface LedgerResponse {
  status: string;
  data: SellerLedger;
}

/**
 * Fetch the authenticated seller's ledger.
 * The query key ['seller-ledger'] can be invalidated later if needed.
 */
export function useSellerLedger(): UseQueryResult<SellerLedger, Error> {
  return useQuery<SellerLedger, Error>({
    queryKey: ['seller-ledger'],
    queryFn: async () => {
      const { data } = await apiClient.get<LedgerResponse>('/seller/ledger');
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
