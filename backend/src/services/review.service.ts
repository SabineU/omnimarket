// backend/src/services/review.service.ts
// Business logic for product reviews.
import { prisma } from '../db.js';
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
  //    A purchase exists if there's at least one order item for this product
  //    in an order that belongs to the user and is not CANCELLED/RETURNED.
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
  const existingReview = await prisma.review.findUnique({
    where: {
      productId_customerId: { productId, customerId: userId },
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
