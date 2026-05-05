/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/upload.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadImageBuffer } from '../../services/upload.service.js';

// Mock the Cloudinary config module so we can intercept calls
vi.mock('../../config/cloudinary.js', () => {
  const mockUploader = {
    upload_stream: vi.fn(),
  };
  return {
    cloudinary: {
      uploader: mockUploader,
    },
  };
});

import { cloudinary } from '../../config/cloudinary.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('uploadImageBuffer', () => {
  it('should upload a buffer and return the secure URL', async () => {
    const fakeUrl = 'https://res.cloudinary.com/demo/image/upload/v12345/sample.jpg';
    const fakeBuffer = Buffer.from('fake-image-data');

    // Cast to any to avoid overload mismatch; the function will be called with
    // (options, callback) as used in the real service.
    (cloudinary.uploader.upload_stream as any).mockImplementation((options: any, callback: any) => {
      // Simulate a successful upload
      callback(null, { secure_url: fakeUrl });
      return { pipe: vi.fn() } as any;
    });

    const url = await uploadImageBuffer(fakeBuffer, 'test-folder');
    expect(url).toBe(fakeUrl);
    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      { folder: 'test-folder', resource_type: 'image' },
      expect.any(Function),
    );
  });

  it('should reject if Cloudinary returns an error', async () => {
    const fakeBuffer = Buffer.from('data');
    (cloudinary.uploader.upload_stream as any).mockImplementation((options: any, callback: any) => {
      callback(new Error('Upload failed'), null);
      return { pipe: vi.fn() } as any;
    });

    await expect(uploadImageBuffer(fakeBuffer)).rejects.toThrow('Upload failed');
  });
});
