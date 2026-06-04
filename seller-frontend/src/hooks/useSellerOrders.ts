// seller-frontend/src/hooks/useSellerOrders.ts
// React Query hook to fetch orders that contain the seller's products.
// UPDATED: SellerOrderItem now includes fulfillmentStatus.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** A single item in a seller's order view */
export interface SellerOrderItem {
  id: string;
  quantity: number;
  priceAtTime: number;
  // NEW: per‑item shipping progress
  fulfillmentStatus?: string; // "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED"
  product: {
    id: string;
    name: string;
    images: { url: string }[];
  };
  variation: {
    sku: string;
    size: string | null;
    color: string | null;
  } | null;
}

/** An order from the seller's perspective */
export interface SellerOrder {
  id: string;
  status: string; // e.g. "CONFIRMED", "SHIPPED", "PARTIALLY_SHIPPED"
  totalAmount: string;
  createdAt: string;
  trackingNumber: string | null;
  customer: {
    name: string;
    email: string;
  };
  items: SellerOrderItem[]; // only the seller's items
}

interface SellerOrdersResponse {
  status: string;
  data: {
    orders: SellerOrder[];
  };
}

/**
 * Fetch all orders that contain the authenticated seller's products.
 * The query key ['seller-orders'] is invalidated after status updates.
 */
export function useSellerOrders(): UseQueryResult<SellerOrdersResponse, Error> {
  return useQuery<SellerOrdersResponse, Error>({
    queryKey: ['seller-orders'],
    queryFn: async () => {
      const { data } = await apiClient.get<SellerOrdersResponse>('/seller/orders');
      return data;
    },
  });
}
