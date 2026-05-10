/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/invoice.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateInvoiceBuffer } from '../../services/invoice.service.js';

vi.mock('../../db.js', () => {
  return {
    prisma: {
      order: {
        findUnique: vi.fn(),
      },
    },
  };
});

vi.mock('pdfkit', () => {
  const EventEmitter = require('events');
  class MockDocument extends EventEmitter {
    public buffers: Buffer[] = [];
    public pipe = vi.fn();
    public font = vi.fn().mockReturnThis();
    public fontSize = vi.fn().mockReturnThis();
    public text = vi.fn().mockReturnThis();
    public moveTo = vi.fn().mockReturnThis();
    public lineTo = vi.fn().mockReturnThis();
    public stroke = vi.fn().mockReturnThis();
    public addPage = vi.fn().mockReturnThis();
    public end(): void {
      this.emit('data', Buffer.from('fake-pdf-'));
      this.emit('data', Buffer.from('data'));
      this.emit('end');
    }
  }
  return { default: MockDocument };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateInvoiceBuffer', () => {
  it('should return a Buffer when order is valid', async () => {
    const mockOrder = {
      id: 'o1',
      customerId: 'user-1',
      customer: { name: 'Alice', email: 'alice@test.com' },
      shippingAddress: {
        street: '123 Main',
        city: 'Test',
        zipCode: '12345',
        country: 'USA',
      },
      items: [
        {
          product: {
            name: 'Widget',
            seller: { storeName: 'Widgets Inc' }, // seller via product
          },
          variation: { sku: 'W-001', size: 'M', color: 'Red' },
          quantity: 2,
          priceAtTime: 10,
        },
      ],
      totalAmount: 20,
      createdAt: new Date(),
    };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

    const buffer = await generateInvoiceBuffer('o1', 'user-1');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.toString()).toContain('fake-pdf-data');
  });

  it('should throw if order not found', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
    await expect(generateInvoiceBuffer('bad', 'user-1')).rejects.toThrow('Order not found');
  });

  it('should throw if order belongs to another user', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'o2',
      customerId: 'other',
    } as any);
    await expect(generateInvoiceBuffer('o2', 'user-1')).rejects.toThrow('Order not found');
  });
});
