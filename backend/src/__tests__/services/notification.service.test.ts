// backend/src/__tests__/services/notification.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendCustomerOrderConfirmation,
  sendSellerNewOrderNotification,
} from '../../services/notification.service.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('notification service', () => {
  it('should log customer notification', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendCustomerOrderConfirmation('user-1', 'order-1');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('CUSTOMER'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('user user-1'));

    consoleSpy.mockRestore();
  });

  it('should log seller notification', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendSellerNewOrderNotification('seller-1', 'order-1');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SELLER'));
    consoleSpy.mockRestore();
  });
});
