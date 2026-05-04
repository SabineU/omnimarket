// backend/src/services/address.service.ts
// Business logic for shipping addresses.
// Every function receives a userId so that a user can only access their own addresses.

import { prisma } from '../db.js';
import type { Address } from '@prisma/client';

/**
 * Retrieve all addresses belonging to the authenticated user.
 */
export async function getAddresses(userId: string): Promise<Address[]> {
  return prisma.address.findMany({
    where: { userId },
  });
}

/**
 * Get a single address by its ID, ensuring it belongs to the given user.
 * Throws a generic error if the address is not found (don't leak whether it exists).
 */
export async function getAddressById(addressId: string, userId: string): Promise<Address> {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) {
    throw new Error('Address not found');
  }
  return address;
}

/**
 * Create a new address for the user.
 * If the new address is set as default, all other addresses for this user
 * are unmarked as default first.
 */
export async function createAddress(
  userId: string,
  data: {
    street: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
    isDefault?: boolean;
  },
): Promise<Address> {
  // If the new address is the default, unset any existing default
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.address.create({
    data: {
      ...data,
      userId,
    },
  });
}

/**
 * Update an existing address owned by the user.
 * If isDefault is set to true, unset other defaults (same logic as create).
 */
export async function updateAddress(
  addressId: string,
  userId: string,
  data: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    isDefault?: boolean;
  },
): Promise<Address> {
  // Ensure the address exists and belongs to the user
  await getAddressById(addressId, userId);

  // Handle default logic
  if (data.isDefault === true) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.address.update({
    where: { id: addressId },
    data,
  });
}

/**
 * Delete an address owned by the user.
 */
export async function deleteAddress(addressId: string, userId: string): Promise<void> {
  // Verify ownership before deletion
  await getAddressById(addressId, userId);
  await prisma.address.delete({ where: { id: addressId } });
}
