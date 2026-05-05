/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/public-product.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPublicProducts, getProductBySlug } from '../../services/public-product.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      product: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(), // <-- added for getProductBySlug
      },
      category: {
        findUnique: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// getPublicProducts (existing)
// =============================================================================
describe('getPublicProducts', () => {
  it('should return products with default pagination and only ACTIVE status', async () => {
    const mockProducts = [
      {
        id: 'p1',
        name: 'Product A',
        status: 'ACTIVE',
        basePrice: 100,
        images: [],
        variations: [],
        seller: { id: 's1', storeName: 'Store A' },
        reviews: [],
      },
    ];
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);
    vi.mocked(prisma.product.count).mockResolvedValue(1);

    const result = await getPublicProducts({});
    expect(result.products).toHaveLength(1);
    expect(result.pagination.totalItems).toBe(1);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
        skip: 0,
        take: 20,
      }),
    );
  });

  it('should apply text search filter', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await getPublicProducts({ search: 'laptop' });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          OR: [
            { name: { contains: 'laptop', mode: 'insensitive' } },
            { description: { contains: 'laptop', mode: 'insensitive' } },
            { brand: { contains: 'laptop', mode: 'insensitive' } },
          ],
        }),
      }),
    );
  });

  it('should filter by category slug and include descendants', async () => {
    const mockCategory = {
      id: 'cat-1',
      slug: 'electronics',
      children: [{ id: 'cat-2', slug: 'laptops', children: [] }],
    };
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as any);
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await getPublicProducts({ category: 'electronics' });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: { in: ['cat-1', 'cat-2'] },
        }),
      }),
    );
  });

  it('should apply price range filters', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await getPublicProducts({ minPrice: 10, maxPrice: 50 });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          basePrice: { gte: 10, lte: 50 },
        }),
      }),
    );
  });

  it('should respect pagination parameters', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(100);

    await getPublicProducts({ page: 3, limit: 10 });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
  });

  it('should sort by price ascending', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await getPublicProducts({ sort: 'price_asc' });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { basePrice: 'asc' },
      }),
    );
  });
});

// =============================================================================
// getProductBySlug (new)
// =============================================================================
describe('getProductBySlug', () => {
  it('should return a product with its details when found', async () => {
    const mockProduct = {
      id: 'p1',
      slug: 'smartphone',
      name: 'Smartphone',
      basePrice: 699.99,
      status: 'ACTIVE',
      images: [{ url: 'http://example.com/img.jpg', altText: 'Phone' }],
      variations: [{ sku: 'SP1', color: 'Black', stockQty: 10 }],
      seller: { id: 's1', storeName: 'TechStore' },
      reviews: [{ rating: 5 }, { rating: 4 }],
    };
    vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as any);

    const result = await getProductBySlug('smartphone');
    expect(result.name).toBe('Smartphone');
    expect(result.averageRating).toBe(4.5);
    expect(result.reviewCount).toBe(2);
    expect(prisma.product.findUnique).toHaveBeenCalledWith({
      where: { slug: 'smartphone' },
      include: expect.objectContaining({
        images: { orderBy: { sortOrder: 'asc' } },
        variations: true,
        seller: { select: { id: true, storeName: true } },
        reviews: { select: { rating: true } },
      }),
    });
  });

  it('should throw an error if the slug is not found', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    await expect(getProductBySlug('nonexistent')).rejects.toThrow('Product not found');
  });
});
