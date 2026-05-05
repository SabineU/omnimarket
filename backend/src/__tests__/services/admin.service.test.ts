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
} from '../../services/admin.service.js';

vi.mock('../../db.js', () => {
  return {
    prisma: {
      sellerProfile: {
        findUnique: vi.fn(),
        update: vi.fn(),
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
// Seller Approval (existing)
// =============================================================================
describe('approveSeller', () => {
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
// Category CRUD (existing)
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
// Product Moderation (new)
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
