// seller-frontend/src/hooks/useImageUpload.ts
// Mutation hook for uploading a product image to the server.
// Calls POST /api/seller/upload with multipart/form-data.
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

/** Response shape from the upload endpoint */
interface UploadResponse {
  status: string;
  data: {
    url: string;
  };
}

/**
 * Upload a single image file and return its URL (Cloudinary).
 * Shows a toast on success or failure.
 */
export function useImageUpload(): UseMutationResult<string, Error, File> {
  return useMutation<string, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file); // field name the backend expects

      const { data } = await apiClient.post<UploadResponse>('/seller/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data.url;
    },
    onSuccess: () => {
      toast.success('Image uploaded', { duration: 2000 });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload image');
      console.error('Image upload error:', error);
    },
  });
}
