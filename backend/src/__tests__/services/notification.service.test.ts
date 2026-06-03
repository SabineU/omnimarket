/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/notification.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendCustomerOrderConfirmation,
  sendSellerNewOrderNotification,
} from '../../services/notification.service.js';

// Mock the database
vi.mock('../../db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock the email service
vi.mock('../../services/email.service.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../../db.js';
import { sendEmail } from '../../services/email.service.js';

beforeEach((): void => {
  vi.clearAllMocks();
});

describe('notification service', () => {
  it('should send customer confirmation email with correct data', async (): Promise<void> => {
    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'customer@test.com',
      name: 'Test Customer',
    } as any);

    await sendCustomerOrderConfirmation('user-1', 'order-1');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { email: true, name: true },
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@test.com',
        subject: expect.stringContaining('confirmed'),
      }),
    );
  });

  it('should handle missing customer gracefully', async (): Promise<void> => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await sendCustomerOrderConfirmation('bad-id', 'order-1');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    consoleSpy.mockRestore();
  });

  it('should send seller notification with correct data', async (): Promise<void> => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 'seller@test.com',
      name: 'Test Seller',
    } as any);

    await sendSellerNewOrderNotification('seller-1', 'order-2');

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'seller@test.com',
        subject: expect.stringContaining('New order'),
      }),
    );
  });
});
