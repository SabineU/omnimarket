// backend/src/services/upload.service.ts
// Handles uploading images to Cloudinary.
// Uses a memory buffer (no disk writes) and a Readable stream for the Cloudinary SDK.
import { Readable } from 'node:stream';
import { cloudinary } from '../config/cloudinary.js';

/**
 * Upload a single image buffer to Cloudinary.
 * @param buffer - the raw image bytes (from multer memoryStorage)
 * @param folder - optional subfolder in your Cloudinary media library (e.g., 'products')
 * @returns the secure URL of the uploaded image
 */
export async function uploadImageBuffer(buffer: Buffer, folder = 'products'): Promise<string> {
  // Convert the buffer to a readable stream (Cloudinary's uploader expects a stream or path)
  const stream = Readable.from(buffer);

  // Wrap the stream-based upload in a Promise so we can await it
  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image', // only allow image files
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Upload failed'));
        } else {
          // result.secure_url is the HTTPS URL of the uploaded image
          resolve(result.secure_url);
        }
      },
    );

    // Pipe the file buffer into the upload stream
    stream.pipe(uploadStream);
  });
}
