// backend/src/config/cloudinary.ts
// Initialises the Cloudinary SDK with credentials from environment variables.
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config.js';

// Configure Cloudinary only if the required keys are present.
// In tests, these may be empty, and we'll mock the uploader instead.
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true, // always use HTTPS URLs
});

export { cloudinary };
