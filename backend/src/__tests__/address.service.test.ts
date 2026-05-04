/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/address.service.test.ts
// Unit tests for the address service.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../services/address.service.js';

// Mock the database module
vi.mock('../db.js', () => {
  return {
    prisma: {
      address: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

import { prisma } from '../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAddresses', () => {
  it('should call findMany with the correct userId', async () => {
    const mockAddresses = [{ id: 'a1', street: '123 Main' }] as any[];
    vi.mocked(prisma.address.findMany).mockResolvedValue(mockAddresses);

    const result = await getAddresses('user-1');
    expect(result).toEqual(mockAddresses);
    // The service no longer passes an explicit orderBy.
    expect(prisma.address.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });
});

describe('getAddressById', () => {
  it('should return address if it belongs to user', async () => {
    const addr = { id: 'a1', userId: 'user-1', street: '123 Main' } as any;
    vi.mocked(prisma.address.findUnique).mockResolvedValue(addr);

    const result = await getAddressById('a1', 'user-1');
    expect(result).toEqual(addr);
  });

  it('should throw if address not found', async () => {
    vi.mocked(prisma.address.findUnique).mockResolvedValue(null);
    await expect(getAddressById('bad-id', 'user-1')).rejects.toThrow('Address not found');
  });

  it('should throw if address belongs to a different user', async () => {
    const addr = { id: 'a1', userId: 'user-2', street: '123 Main' } as any;
    vi.mocked(prisma.address.findUnique).mockResolvedValue(addr);
    await expect(getAddressById('a1', 'user-1')).rejects.toThrow('Address not found');
  });
});

describe('createAddress', () => {
  it('should create address and unset previous defaults if isDefault is true', async () => {
    const newAddr = { id: 'new', userId: 'user-1', street: '456 Park', isDefault: true } as any;
    vi.mocked(prisma.address.create).mockResolvedValue(newAddr);
    vi.mocked(prisma.address.updateMany).mockResolvedValue({ count: 1 });

    const result = await createAddress('user-1', {
      street: '456 Park',
      city: 'NYC',
      zipCode: '10001',
      country: 'USA',
      isDefault: true,
    });

    expect(prisma.address.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', isDefault: true },
      data: { isDefault: false },
    });
    expect(prisma.address.create).toHaveBeenCalledWith({
      data: {
        street: '456 Park',
        city: 'NYC',
        zipCode: '10001',
        country: 'USA',
        isDefault: true,
        userId: 'user-1',
      },
    });
    expect(result).toEqual(newAddr);
  });
});

describe('updateAddress', () => {
  it('should verify ownership and update the address', async () => {
    const existing = { id: 'a1', userId: 'user-1', street: 'Old' } as any;
    vi.mocked(prisma.address.findUnique).mockResolvedValue(existing);
    const updated = { ...existing, street: 'New' } as any;
    vi.mocked(prisma.address.update).mockResolvedValue(updated);

    const result = await updateAddress('a1', 'user-1', { street: 'New' });
    expect(prisma.address.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { street: 'New' },
    });
    expect(result.street).toBe('New');
  });

  it('should throw if address does not belong to user', async () => {
    const existing = { id: 'a1', userId: 'user-2' } as any;
    vi.mocked(prisma.address.findUnique).mockResolvedValue(existing);
    await expect(updateAddress('a1', 'user-1', { street: 'New' })).rejects.toThrow(
      'Address not found',
    );
  });
});

describe('deleteAddress', () => {
  it('should verify ownership and delete', async () => {
    const existing = { id: 'a1', userId: 'user-1' } as any;
    vi.mocked(prisma.address.findUnique).mockResolvedValue(existing);
    vi.mocked(prisma.address.delete).mockResolvedValue({} as any);

    await deleteAddress('a1', 'user-1');
    expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
  });

  it('should throw if not owner', async () => {
    const existing = { id: 'a1', userId: 'user-2' } as any;
    vi.mocked(prisma.address.findUnique).mockResolvedValue(existing);
    await expect(deleteAddress('a1', 'user-1')).rejects.toThrow('Address not found');
  });
});
