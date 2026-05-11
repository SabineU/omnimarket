/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/seller-review.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSellerReviews } from '../../services/seller-review.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      review: {
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

describe('getSellerReviews', () => {
  it('should return paginated reviews for the seller’s products', async () => {
    const mockReviews = [
      {
        id: 'r1',
        productId: 'p1',
        customerId: 'c1',
        rating: 5,
        comment: 'Nice',
        createdAt: new Date(),
        product: { name: 'Phone', slug: 'phone' },
        customer: { name: 'Alice' },
      },
    ];
    vi.mocked(prisma.review.findMany).mockResolvedValue(mockReviews as any);
    vi.mocked(prisma.review.count).mockResolvedValue(1);

    const result = await getSellerReviews('seller-1', { page: 1, limit: 10 });

    expect(result.reviews.length).toBe(1);
    expect(result.reviews[0].product.name).toBe('Phone');
    expect(result.reviews[0].customer.name).toBe('Alice');
    expect(result.pagination.totalItems).toBe(1);

    // Check the where clause filters by sellerId
    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { product: { sellerId: 'seller-1' } },
      }),
    );
  });

  it('should return empty results when no reviews exist', async () => {
    vi.mocked(prisma.review.findMany).mockResolvedValue([]);
    vi.mocked(prisma.review.count).mockResolvedValue(0);

    const result = await getSellerReviews('seller-2');
    expect(result.reviews).toHaveLength(0);
    expect(result.pagination.totalItems).toBe(0);
  });
});
