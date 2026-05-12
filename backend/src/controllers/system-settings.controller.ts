// backend/src/controllers/system-settings.controller.ts
// Handles HTTP requests for system configuration.
import type { Request, Response, NextFunction } from 'express';
import * as systemSettingsService from '../services/system-settings.service.js';

/**
 * GET /api/admin/settings
 * Returns all system settings as key‑value pairs.
 */
export async function getAllSettings(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const settings = await systemSettingsService.getAllSettings();
    res.status(200).json({
      status: 'success',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/settings
 * Body: { key: string, value: string }
 * Upsert a single setting.
 */
export async function updateSetting(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { key, value } = req.body;
    const setting = await systemSettingsService.setSetting(key, value);
    res.status(200).json({
      status: 'success',
      data: setting,
    });
  } catch (error) {
    next(error);
  }
}
