// backend/src/services/review.service.ts
// Business logic for product reviews.
import prisma from '../lib/prisma.js'; // <-- switched to shared instance
import type { Review } from '@prisma/client';

/** Custom error thrown when a user cannot review a product */
export class ReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewValidationError';
  }
}

/**
 * Submit a review for a product.
 * @returns the created review with the updated average rating for the product.
 */
export async function createReview(
  userId: string,
  productId: string,
  rating: number,
  comment?: string,
): Promise<{ review: Review; averageRating: number; reviewCount: number }> {
  // 1. Verify the user has purchased this product.
  const purchaseExists = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        customerId: userId,
        status: { notIn: ['CANCELLED', 'RETURNED'] },
      },
    },
  });

  if (!purchaseExists) {
    throw new ReviewValidationError('You can only review products you have purchased.');
  }

  // 2. Check that the user hasn't already reviewed this product.
  //    Because the @@unique on (productId, customerId) was dropped,
  //    we must use findFirst instead of findUnique.
  const existingReview = await prisma.review.findFirst({
    where: {
      productId,
      customerId: userId,
    },
  });

  if (existingReview) {
    throw new ReviewValidationError('You have already reviewed this product.');
  }

  // 3. Create the review.
  const review = await prisma.review.create({
    data: {
      productId,
      customerId: userId,
      rating,
      comment: comment ?? null,
    },
  });

  // 4. Calculate the new average rating for the product.
  const aggregation = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const averageRating = aggregation._avg.rating ?? 0;
  const reviewCount = aggregation._count.rating ?? 0;

  return { review, averageRating, reviewCount };
}

/** Options for listing reviews */
export interface ReviewListOptions {
  page?: number;
  limit?: number;
}

/** A review enriched with the customer's name */
export interface ReviewWithCustomer extends Review {
  customer: { name: string };
}

/** Paginated result for reviews */
export interface PaginatedReviews {
  reviews: ReviewWithCustomer[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

/**
 * Return a paginated list of reviews for a given product.
 * Most recent reviews are returned first.
 */
export async function getProductReviews(
  productId: string,
  options: ReviewListOptions = {},
): Promise<PaginatedReviews> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const skip = (page - 1) * limit;

  const where = { productId };

  const [reviews, totalItems] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews: reviews as ReviewWithCustomer[],
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      limit,
    },
  };
}
