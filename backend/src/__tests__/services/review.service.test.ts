/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/review.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createReview, ReviewValidationError } from '../../services/review.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      orderItem: { findFirst: vi.fn() },
      review: {
        findUnique: vi.fn(),
        create: vi.fn(),
        aggregate: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createReview', () => {
  it('should throw if user did not purchase the product', async () => {
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue(null);

    await expect(createReview('user-1', 'product-1', 5)).rejects.toThrow(ReviewValidationError);
  });

  it('should throw if user already reviewed the product', async () => {
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue({ id: 'oi1' } as any);
    vi.mocked(prisma.review.findUnique).mockResolvedValue({ id: 'r1' } as any);

    await expect(createReview('user-1', 'product-1', 4)).rejects.toThrow(ReviewValidationError);
  });

  it('should create a review and return the new average rating', async () => {
    // Purchase exists
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue({ id: 'oi1' } as any);
    // No existing review
    vi.mocked(prisma.review.findUnique).mockResolvedValue(null);

    const createdReview = {
      id: 'r1',
      productId: 'product-1',
      customerId: 'user-1',
      rating: 5,
      comment: 'Great!',
      createdAt: new Date(),
    };
    vi.mocked(prisma.review.create).mockResolvedValue(createdReview as any);

    // Aggregate returns average 4.5 and count 2
    vi.mocked(prisma.review.aggregate).mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { rating: 2 },
    } as any);

    const result = await createReview('user-1', 'product-1', 5, 'Great!');

    expect(result.review).toEqual(createdReview);
    expect(result.averageRating).toBe(4.5);
    expect(result.reviewCount).toBe(2);

    // Verify the review was created with correct data
    expect(prisma.review.create).toHaveBeenCalledWith({
      data: {
        productId: 'product-1',
        customerId: 'user-1',
        rating: 5,
        comment: 'Great!',
      },
    });
  });
});
