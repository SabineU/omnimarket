// backend/src/controllers/upload.controller.ts
// Handles image upload requests.
import type { Request, Response, NextFunction } from 'express';
import * as uploadService from '../services/upload.service.js';

/**
 * POST /api/seller/upload
 * Expects a multipart form with a file in the "image" field.
 * Returns the secure Cloudinary URL of the uploaded image.
 */
export async function uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // `req.file` is populated by the multer middleware
    if (!req.file) {
      res.status(400).json({
        status: 'error',
        message: 'No image file provided. Make sure the field name is "image".',
      });
      return;
    }

    // Upload the buffer to Cloudinary
    const imageUrl = await uploadService.uploadImageBuffer(req.file.buffer);

    res.status(201).json({
      status: 'success',
      data: { url: imageUrl },
    });
  } catch (error) {
    // If the error is a multer error (like file too large), forward it
    next(error);
  }
}
