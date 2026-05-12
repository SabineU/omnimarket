// backend/src/services/system-settings.service.ts
// Business logic for platform configuration settings.
import { prisma } from '../db.js';

/** A single setting as stored in the database */
export interface SystemSetting {
  key: string;
  value: string;
}

/**
 * Retrieve all system settings as an object of key‑value pairs.
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.systemSetting.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

/**
 * Upsert a single setting. If the key already exists, update it; otherwise create it.
 */
export async function setSetting(key: string, value: string): Promise<SystemSetting> {
  const result = await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  return { key: result.key, value: result.value };
}
