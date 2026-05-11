// backend/src/services/seller-review.service.ts
// Business logic for the seller's review dashboard.
import { prisma } from '../db.js';
import type { Review } from '@prisma/client';

/** A review enriched with product and customer names */
export interface SellerReview extends Review {
  product: { name: string; slug: string };
  customer: { name: string };
}

/** Paginated result shape */
export interface PaginatedSellerReviews {
  reviews: SellerReview[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

/**
 * Return reviews for all products belonging to the given seller.
 * Most recent reviews first, with pagination.
 */
export async function getSellerReviews(
  sellerId: string,
  options: { page?: number; limit?: number } = {},
): Promise<PaginatedSellerReviews> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const skip = (page - 1) * limit;

  // Filter: only reviews for products sold by this seller
  const where = {
    product: { sellerId },
  };

  const [reviews, totalItems] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        product: { select: { name: true, slug: true } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews: reviews as SellerReview[],
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      limit,
    },
  };
}
