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
  totalEarned: number;
  commissionRate: number;
  totalCommission: number;
  netEarnings: number;
  pendingPayout: number;
  transactions: LedgerTransaction[];
}

/**
 * Retrieve the earnings and transaction history for a seller.
 */
export async function getSellerLedger(sellerId: string): Promise<SellerLedger> {
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: sellerId },
    select: { commissionRate: true },
  });
  const commissionRate = profile?.commissionRate ? Number(profile.commissionRate) : 10;

  const items = await prisma.orderItem.findMany({
    where: { sellerId },
    include: {
      order: { select: { id: true, status: true, createdAt: true } },
      product: { select: { name: true } },
    },
    orderBy: { order: { createdAt: 'desc' } },
  });

  let totalEarned = 0;
  const transactions: LedgerTransaction[] = [];

  for (const item of items) {
    const lineTotal = Number(item.priceAtTime) * item.quantity;

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

  const totalCommission = (totalEarned * commissionRate) / 100;
  const netEarnings = totalEarned - totalCommission;

  return {
    totalEarned,
    commissionRate,
    totalCommission,
    netEarnings,
    pendingPayout: netEarnings,
    transactions,
  };
}

/**
 * Generate a CSV string of the seller's transaction history.
 * The first line is a header row; each subsequent line is a transaction.
 * @param sellerId – the authenticated seller's ID
 * @returns CSV string
 */
export async function generateLedgerCsv(sellerId: string): Promise<string> {
  const { transactions } = await getSellerLedger(sellerId);

  // Build the CSV header
  const headers = ['Order ID', 'Product', 'Quantity', 'Unit Price', 'Total', 'Status', 'Date'];

  // Escape a value for CSV: wrap in double quotes if it contains a comma,
  // double quote, or newline, and double any existing double quotes.
  function escapeCsv(value: string | number): string {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headerLine = headers.map(escapeCsv).join(',');
  const rows = transactions.map((t) =>
    [
      t.orderId,
      t.productName,
      t.quantity,
      t.unitPrice.toFixed(2),
      t.total.toFixed(2),
      t.orderStatus,
      t.createdAt.slice(0, 10),
    ]
      .map(escapeCsv)
      .join(','),
  );

  return [headerLine, ...rows].join('\n');
}
