/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/review.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createReview,
  getProductReviews,
  ReviewValidationError,
} from '../../services/review.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      orderItem: { findFirst: vi.fn() },
      review: {
        findUnique: vi.fn(),
        create: vi.fn(),
        aggregate: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createReview
// ---------------------------------------------------------------------------
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
    vi.mocked(prisma.orderItem.findFirst).mockResolvedValue({ id: 'oi1' } as any);
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

    vi.mocked(prisma.review.aggregate).mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { rating: 2 },
    } as any);

    const result = await createReview('user-1', 'product-1', 5, 'Great!');

    expect(result.review).toEqual(createdReview);
    expect(result.averageRating).toBe(4.5);
    expect(result.reviewCount).toBe(2);

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

// ---------------------------------------------------------------------------
// getProductReviews
// ---------------------------------------------------------------------------
describe('getProductReviews', () => {
  it('should return paginated reviews with customer name', async () => {
    const mockReviews = [
      {
        id: 'r1',
        productId: 'product-1',
        customerId: 'user-1',
        rating: 5,
        comment: 'Awesome',
        createdAt: new Date(),
        customer: { name: 'Alice' },
      },
    ];
    vi.mocked(prisma.review.findMany).mockResolvedValue(mockReviews as any);
    vi.mocked(prisma.review.count).mockResolvedValue(1);

    const result = await getProductReviews('product-1', { page: 1, limit: 10 });

    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].customer.name).toBe('Alice');
    expect(result.pagination.totalItems).toBe(1);
    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: 'product-1' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } },
      }),
    );
  });

  it('should return empty array when no reviews exist', async () => {
    vi.mocked(prisma.review.findMany).mockResolvedValue([]);
    vi.mocked(prisma.review.count).mockResolvedValue(0);

    const result = await getProductReviews('product-1');
    expect(result.reviews).toHaveLength(0);
    expect(result.pagination.totalItems).toBe(0);
  });
});
