/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/system-settings.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllSettings, setSetting } from '../../services/system-settings.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      systemSetting: {
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAllSettings', () => {
  it('should return an empty object when no settings exist', async () => {
    vi.mocked(prisma.systemSetting.findMany).mockResolvedValue([]);
    const settings = await getAllSettings();
    expect(settings).toEqual({});
  });

  it('should return key‑value pairs', async () => {
    vi.mocked(prisma.systemSetting.findMany).mockResolvedValue([
      { key: 'commissionRate', value: '12' },
      { key: 'taxRate', value: '5' },
    ] as any);

    const settings = await getAllSettings();
    expect(settings).toEqual({
      commissionRate: '12',
      taxRate: '5',
    });
  });
});

describe('setSetting', () => {
  it('should upsert a setting and return it', async () => {
    const mockResult = { key: 'taxRate', value: '7' };
    vi.mocked(prisma.systemSetting.upsert).mockResolvedValue(mockResult as any);

    const result = await setSetting('taxRate', '7');
    expect(result).toEqual({ key: 'taxRate', value: '7' });
    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: 'taxRate' },
      update: { value: '7' },
      create: { key: 'taxRate', value: '7' },
    });
  });
});
