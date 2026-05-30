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
  listSellers, // <-- NEW import
} from '../../services/admin.service.js';

// ---------------------------------------------------------------------------
// Mock the database module – UPDATED to include sellerProfile.findMany & count
// ---------------------------------------------------------------------------
vi.mock('../../db.js', () => {
  return {
    prisma: {
      sellerProfile: {
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(), // <-- NEW: for listSellers
        count: vi.fn(), // <-- NEW: for listSellers pagination
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

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// Seller Approval (existing tests – unchanged)
// =============================================================================
describe('approveSeller', () => {
  // ... existing tests remain exactly as they are ...
  it('should approve a seller when profile exists and user is a seller', async () => {
    const mockProfile = { userId: 'seller-1', isApproved: false, user: { role: 'SELLER' } } as any;
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

  it('should reject a seller (isApproved = false)', async () => {
    const mockProfile = { userId: 'seller-2', isApproved: true, user: { role: 'SELLER' } } as any;
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(mockProfile);
    const updatedProfile = { ...mockProfile, isApproved: false };
    vi.mocked(prisma.sellerProfile.update).mockResolvedValue(updatedProfile as any);
    const result = await approveSeller('seller-2', false);
    expect(result.isApproved).toBe(false);
  });

  it('should throw SellerNotFoundError if profile does not exist', async () => {
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(null);
    await expect(approveSeller('nonexistent', true)).rejects.toThrow(SellerNotFoundError);
  });

  it('should throw if user is not a seller', async () => {
    const mockProfile = { userId: 'user-1', isApproved: false, user: { role: 'CUSTOMER' } } as any;
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(mockProfile);
    await expect(approveSeller('user-1', true)).rejects.toThrow('User is not a seller');
  });
});

// =============================================================================
// Category CRUD (existing tests – unchanged)
// =============================================================================
describe('createCategory', () => {
  it('should create a category and return it', async () => {
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
  it('should update a category', async () => {
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

  it('should throw if category not found', async () => {
    vi.mocked(prisma.category.findUniqueOrThrow).mockRejectedValue(new Error('Not found'));
    await expect(updateCategory('bad-id', { name: 'New' })).rejects.toThrow('Not found');
  });
});

describe('deleteCategory', () => {
  it('should delete a category', async () => {
    vi.mocked(prisma.category.findUniqueOrThrow).mockResolvedValue({ id: 'cat-1' } as any);
    vi.mocked(prisma.category.delete).mockResolvedValue({} as any);
    await expect(deleteCategory('cat-1')).resolves.toBeUndefined();
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
  });

  it('should throw if category not found', async () => {
    vi.mocked(prisma.category.findUniqueOrThrow).mockRejectedValue(new Error('Not found'));
    await expect(deleteCategory('bad-id')).rejects.toThrow('Not found');
  });
});

// =============================================================================
// Product Moderation (existing tests – unchanged)
// =============================================================================
describe('getAllProducts', () => {
  it('should return all products when no filter is provided', async () => {
    const mockProducts = [
      { id: 'p1', name: 'Product A', status: 'ACTIVE' },
      { id: 'p2', name: 'Product B', status: 'PENDING' },
    ];
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);
    const result = await getAllProducts();
    expect(result).toHaveLength(2);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('should filter products by status', async () => {
    const mockProducts = [{ id: 'p1', name: 'Product A', status: 'PENDING' }];
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);
    const result = await getAllProducts({ status: 'PENDING' });
    expect(result).toHaveLength(1);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PENDING' },
      }),
    );
  });
});

describe('updateProductStatus', () => {
  it('should update the product status', async () => {
    vi.mocked(prisma.product.findUniqueOrThrow).mockResolvedValue({ id: 'p1' } as any);
    const updated = {
      id: 'p1',
      name: 'Product A',
      status: 'ACTIVE',
      seller: { storeName: 'S' },
      category: { name: 'C' },
      images: [],
      variations: [],
    };
    vi.mocked(prisma.product.update).mockResolvedValue(updated as any);
    const result = await updateProductStatus('p1', 'ACTIVE');
    expect(result.status).toBe('ACTIVE');
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { status: 'ACTIVE' },
      }),
    );
  });

  it('should throw if product not found', async () => {
    vi.mocked(prisma.product.findUniqueOrThrow).mockRejectedValue(new Error('Not found'));
    await expect(updateProductStatus('bad-id', 'ACTIVE')).rejects.toThrow('Not found');
  });
});

// =============================================================================
// listSellers (NEW – seller verification listing)
// =============================================================================
describe('listSellers', () => {
  it('should return paginated sellers with user details', async () => {
    // Arrange: a seller profile with its related user
    const mockProfile = {
      userId: 'seller-1',
      storeName: 'Tech Store',
      description: 'Selling gadgets',
      isApproved: false,
      commissionRate: 10, // already a number in the mock (the service calls Number())
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

    // Act
    const result = await listSellers({ page: 1, limit: 10 });

    // Assert
    expect(result.sellers).toHaveLength(1);
    expect(result.sellers[0].userId).toBe('seller-1');
    expect(result.sellers[0].name).toBe('Bob Seller');
    expect(result.sellers[0].email).toBe('bob@test.com');
    expect(result.sellers[0].storeName).toBe('Tech Store');
    expect(result.sellers[0].isApproved).toBe(false);
    expect(result.sellers[0].commissionRate).toBe(10);
    expect(result.sellers[0].createdAt).toBe('2026-05-01T00:00:00.000Z');
    expect(result.pagination.totalItems).toBe(1);
    expect(result.pagination.currentPage).toBe(1);
  });

  it('should filter by approval status (isApproved = true)', async () => {
    vi.mocked(prisma.sellerProfile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sellerProfile.count).mockResolvedValue(0);

    await listSellers({ isApproved: true });

    // Verify the where clause includes the isApproved filter
    expect(prisma.sellerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isApproved: true }),
      }),
    );
  });

  it('should filter by search term across name, email, and store name', async () => {
    vi.mocked(prisma.sellerProfile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sellerProfile.count).mockResolvedValue(0);

    await listSellers({ search: 'bob' });

    // Verify the where clause includes an OR with three conditions
    const callArgs = (prisma.sellerProfile.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.where.OR).toHaveLength(3);
  });

  it('should respect pagination parameters', async () => {
    vi.mocked(prisma.sellerProfile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sellerProfile.count).mockResolvedValue(50);

    await listSellers({ page: 3, limit: 5 });

    expect(prisma.sellerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10, // (page 3 - 1) * limit 5 = 10
        take: 5,
      }),
    );
  });

  it('should return empty array when no sellers exist', async () => {
    vi.mocked(prisma.sellerProfile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.sellerProfile.count).mockResolvedValue(0);

    const result = await listSellers();

    expect(result.sellers).toHaveLength(0);
    expect(result.pagination.totalItems).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });
});
