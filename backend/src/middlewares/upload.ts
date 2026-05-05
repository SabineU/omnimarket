// backend/src/middlewares/upload.ts
// Multer middleware for handling image file uploads.
// Uses memory storage so the file is available as a buffer in req.file.
import multer, { memoryStorage } from 'multer';

// Allowed image MIME types (whitelist)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

const upload = multer({
  storage: memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum file size
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true); // accept file
    } else {
      // Reject file with an error message
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        ),
      );
    }
  },
});

// Export a middleware that expects a single file in the field named "image"
export const uploadSingleImage = upload.single('image');
