/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/admin.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  approveSeller,
  SellerNotFoundError,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllProducts,
  updateProductStatus,
  listSellers,
} from '../../services/admin.service.js';

// Mock the database module – updated with sellerProfile.findMany/count
vi.mock('../../db.js', () => {
  return {
    prisma: {
      sellerProfile: {
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      category: {
        create: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      product: {
        findMany: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

// beforeEach needs an explicit return type
beforeEach((): void => {
  vi.clearAllMocks();
});

// =============================================================================
// Seller Approval (unchanged)
// =============================================================================
describe('approveSeller', () => {
  it('should approve a seller when profile exists and user is a seller', async (): Promise<void> => {
    const mockProfile = {
      userId: 'seller-1',
      isApproved: false,
      user: { role: 'SELLER' },
    } as any;
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(mockProfile);
    const updatedProfile = { ...mockProfile, isApproved: true };
    vi.mocked(prisma.sellerProfile.update).mockResolvedValue(updatedProfile as any);
    const result = await approveSeller('seller-1', true);
    expect(result.isApproved).toBe(true);
    expect(prisma.sellerProfile.update).toHaveBeenCalledWith({
      where: { userId: 'seller-1' },
      data: { isApproved: true },
    });
  });

  it('should reject a seller (isApproved = false)', async (): Promise<void> => {
    const mockProfile = {
      userId: 'seller-2',
      isApproved: true,
      user: { role: 'SELLER' },
    } as any;
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(mockProfile);
    const updatedProfile = { ...mockProfile, isApproved: false };
    vi.mocked(prisma.sellerProfile.update).mockResolvedValue(updatedProfile as any);
    const result = await approveSeller('seller-2', false);
    expect(result.isApproved).toBe(false);
  });

  it('should throw SellerNotFoundError if profile does not exist', async (): Promise<void> => {
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(null);
    await expect(approveSeller('nonexistent', true)).rejects.toThrow(SellerNotFoundError);
  });

  it('should throw if user is not a seller', async (): Promise<void> => {
    const mockProfile = {
      userId: 'user-1',
      isApproved: false,
      user: { role: 'CUSTOMER' },
    } as any;
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(mockProfile);
    await expect(approveSeller('user-1', true)).rejects.toThrow('User is not a seller');
  });
});

// =============================================================================
// Category CRUD (unchanged)
// =============================================================================
describe('createCategory', () => {
  it('should create a category and return it', async (): Promise<void> => {
    const input = { name: 'Books', slug: 'books', parentId: null, imageUrl: null };
    const created = { id: 'cat-1', ...input } as any;
    vi.mocked(prisma.category.create).mockResolvedValue(created);
    const result = await createCategory(input);
    expect(result.slug).toBe('books');
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { name: 'Books', slug: 'books', parentId: null, imageUrl: null },
    });
  });
});

describe('updateCategory', () => {
  it('should update a category', async (): Promise<void> => {
    const existing = { id: 'cat-1', name: 'Books', slug: 'books' };
    vi.mocked(prisma.category.findUniqueOrThrow).mockResolvedValue(existing as any);
    const updated = { ...existing, name: 'Updated Books' };
    vi.mocked(prisma.category.update).mockResolvedValue(updated as any);
    const result = await updateCategory('cat-1', { name: 'Updated Books' });
    expect(result.name).toBe('Updated Books');
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'cat-1' },
      data: { name: 'Updated Books' },
    });
  });

  it('should throw if category not found', async (): Promise<void> => {
    vi.mocked(prisma.category.findUniqueOrThrow).mockRejectedValue(new Error('Not found'));
    await expect(updateCategory('bad-id', { name: 'New' })).rejects.toThrow('Not found');
  });
});

describe('deleteCategory', () => {
  it('should delete a category', async (): Promise<void> => {
    vi.mocked(prisma.category.findUniqueOrThrow).mockResolvedValue({ id: 'cat-1' } as any);
    vi.mocked(prisma.category.delete).mockResolvedValue({} as any);
    await expect(deleteCategory('cat-1')).resolves.toBeUndefined();
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
  });

  it('should throw if category not found', async (): Promise<void> => {
    vi.mocked(prisma.category.findUniqueOrThrow).mockRejectedValue(new Error('Not found'));
    await expect(deleteCategory('bad-id')).rejects.toThrow('Not found');
  });
});

// =============================================================================
// Product Moderation (UPDATED for flattened response)
// =============================================================================
describe('getAllProducts', () => {
  it('should return flattened products with sellerName when no filter is provided', async (): Promise<void> => {
    // Helper: simulate Prisma Decimal .toNumber()
    const decimal = (n: number): { toNumber: () => number } => ({
      toNumber: (): number => n,
    });

    const rawProducts = [
      {
        id: 'p1',
        name: 'Product A',
        slug: 'prod-a',
        description: 'Desc',
        basePrice: decimal(100),
        status: 'ACTIVE',
        brand: 'BrandX',
        sellerId: 's1',
        seller: { storeName: 'Store A' },
        category: { name: 'Cat A' },
        images: [{ id: 'img1', url: 'http://img.com', altText: 'img', sortOrder: 0 }],
        variations: [
          {
            id: 'v1',
            sku: 'SKU1',
            size: 'M',
            color: 'Red',
            priceModifier: decimal(0),
            stockQty: 5,
          },
        ],
        createdAt: new Date('2026-05-01'),
      },
    ];
    vi.mocked(prisma.product.findMany).mockResolvedValue(rawProducts as any);

    const result = await getAllProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Product A');
    expect(result[0].sellerName).toBe('Store A');
    expect(result[0].categoryName).toBe('Cat A');
    expect(result[0].basePrice).toBe(100);
    expect(result[0].variations[0].priceModifier).toBe(0);
  });

  it('should filter products by status', async (): Promise<void> => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    await getAllProducts({ status: 'PENDING' });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PENDING' },
      }),
    );
  });
});

describe('updateProductStatus', () => {
  it('should update the product status and return flattened shape', async (): Promise<void> => {
    const decimal = (n: number): { toNumber: () => number } => ({
      toNumber: (): number => n,
    });

    vi.mocked(prisma.product.findUniqueOrThrow).mockResolvedValue({ id: 'p1' } as any);
    const rawUpdated = {
      id: 'p1',
      name: 'Product A',
      slug: 'prod-a',
      description: 'Desc',
      basePrice: decimal(50),
      status: 'ACTIVE',
      brand: null,
      sellerId: 's1',
      seller: { storeName: 'S' },
      category: { name: 'C' },
      images: [],
      variations: [],
      createdAt: new Date('2026-05-01'),
    };
    vi.mocked(prisma.product.update).mockResolvedValue(rawUpdated as any);

    const result = await updateProductStatus('p1', 'ACTIVE');
    expect(result.status).toBe('ACTIVE');
    expect(result.sellerName).toBe('S');
    expect(result.categoryName).toBe('C');
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { status: 'ACTIVE' },
      }),
    );
  });

  it('should throw if product not found', async (): Promise<void> => {
    vi.mocked(prisma.product.findUniqueOrThrow).mockRejectedValue(new Error('Not found'));
    await expect(updateProductStatus('bad-id', 'ACTIVE')).rejects.toThrow('Not found');
  });
});

// =============================================================================
// listSellers (unchanged)
// =============================================================================
describe('listSellers', () => {
  it('should return paginated sellers with user details', async (): Promise<void> => {
    const mockProfile = {
      userId: 'seller-1',
      storeName: 'Tech Store',
      description: 'Selling gadgets',
      isApproved: false,
      commissionRate: 10,
      createdAt: new Date('2026-05-01'),
      user: {
        id: 'seller-1',
        name: 'Bob Seller',
        email: 'bob@test.com',
        createdAt: new Date('2026-05-01'),
      },
    };
    vi.mocked(prisma.sellerProfile.findMany).mockResolvedValue([mockProfile] as any);
    vi.mocked(prisma.sellerProfile.count).mockResolvedValue(1);

    const result = await listSellers({ page: 1, limit: 10 });
    expect(result.sellers).toHaveLength(1);
    expect(result.sellers[0].storeName).toBe('Tech Store');
    expect(result.sellers[0].name).toBe('Bob Seller');
  });

  it('should filter by approval status', async (): Promise<void> => {
    vi.mocked(prisma.sellerProfile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sellerProfile.count).mockResolvedValue(0);
    await listSellers({ isApproved: true });
    expect(prisma.sellerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isApproved: true }),
      }),
    );
  });

  it('should respect pagination', async (): Promise<void> => {
    vi.mocked(prisma.sellerProfile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sellerProfile.count).mockResolvedValue(50);
    await listSellers({ page: 3, limit: 5 });
    expect(prisma.sellerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 }),
    );
  });
});
