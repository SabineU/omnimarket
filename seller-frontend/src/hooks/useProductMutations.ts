// seller-frontend/src/hooks/useProductMutations.ts
// Mutation hooks for creating, updating, and deleting products.
// All three invalidate the ['seller-products'] query on success so the
// list page refetches automatically.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Payload for creating a new product */
export interface CreateProductPayload {
  name: string;
  description: string;
  categoryId: string;
  basePrice: number;
  brand?: string;
  variations: {
    sku: string;
    size?: string;
    color?: string;
    priceModifier: number;
    stockQty: number;
  }[];
  images: {
    url: string;
    altText: string;
  }[];
}

/** Payload for updating an existing product */
export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  productId: string;
}

/** Minimal product object returned after mutation */
interface ProductResponse {
  status: string;
  data: {
    product: { id: string; name: string };
  };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Create a new product.
 * On success, invalidates the product list and shows a toast.
 */
export function useCreateProduct(): UseMutationResult<
  ProductResponse,
  Error,
  CreateProductPayload
> {
  const queryClient = useQueryClient();

  return useMutation<ProductResponse, Error, CreateProductPayload>({
    mutationFn: async (payload: CreateProductPayload) => {
      const { data } = await apiClient.post<ProductResponse>('/seller/products', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Product created successfully');
      void queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create product');
      console.error('Create product error:', error);
    },
  });
}

/**
 * Update an existing product.
 * Sends a PUT request with the fields that need to change.
 */
export function useUpdateProduct(): UseMutationResult<
  ProductResponse,
  Error,
  UpdateProductPayload
> {
  const queryClient = useQueryClient();

  return useMutation<ProductResponse, Error, UpdateProductPayload>({
    mutationFn: async ({ productId, ...payload }: UpdateProductPayload) => {
      const { data } = await apiClient.put<ProductResponse>(
        `/seller/products/${productId}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Product updated');
      void queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update product');
      console.error('Update product error:', error);
    },
  });
}

/**
 * Delete a product by ID.
 * On success, invalidates the product list and shows a toast.
 */
export function useDeleteProduct(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (productId: string) => {
      await apiClient.delete(`/seller/products/${productId}`);
    },
    onSuccess: () => {
      toast.success('Product deleted');
      void queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete product');
      console.error('Delete product error:', error);
    },
  });
}
