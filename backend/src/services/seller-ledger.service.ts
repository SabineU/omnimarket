// backend/src/services/seller-ledger.service.ts
// Business logic for the seller's ledger (earnings & transaction history).
import { prisma } from '../db.js';

/** A single transaction line in the ledger */
export interface LedgerTransaction {
  orderId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  orderStatus: string;
  createdAt: string; // ISO date string
}

/** Full ledger summary */
export interface SellerLedger {
  totalEarned: number; // gross revenue from all non‑cancelled orders
  commissionRate: number; // platform commission percentage (e.g., 10)
  totalCommission: number; // amount deducted as commission
  netEarnings: number; // totalEarned – totalCommission
  pendingPayout: number; // placeholder – same as netEarnings for now
  transactions: LedgerTransaction[];
}

/**
 * Retrieve the earnings and transaction history for a seller.
 * @param sellerId – the authenticated seller's ID
 */
export async function getSellerLedger(sellerId: string): Promise<SellerLedger> {
  // 1. Get the seller's commission rate (default to 10%)
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: sellerId },
    select: { commissionRate: true },
  });
  const commissionRate = profile?.commissionRate ? Number(profile.commissionRate) : 10;

  // 2. Fetch all order items belonging to this seller,
  //    including the order status and product name.
  const items = await prisma.orderItem.findMany({
    where: { sellerId },
    include: {
      order: { select: { id: true, status: true, createdAt: true } },
      product: { select: { name: true } },
    },
    orderBy: { order: { createdAt: 'desc' } },
  });

  // 3. Build the transaction list and compute total earned.
  let totalEarned = 0;
  const transactions: LedgerTransaction[] = [];

  for (const item of items) {
    const lineTotal = Number(item.priceAtTime) * item.quantity;

    // Only count revenue from orders that are not cancelled/returned
    if (item.order.status !== 'CANCELLED' && item.order.status !== 'RETURNED') {
      totalEarned += lineTotal;
    }

    transactions.push({
      orderId: item.order.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: Number(item.priceAtTime),
      total: lineTotal,
      orderStatus: item.order.status,
      createdAt: item.order.createdAt.toISOString(),
    });
  }

  // 4. Calculate commission and net earnings
  const totalCommission = (totalEarned * commissionRate) / 100;
  const netEarnings = totalEarned - totalCommission;

  return {
    totalEarned,
    commissionRate,
    totalCommission,
    netEarnings,
    pendingPayout: netEarnings, // placeholder – will be refined later
    transactions,
  };
}
