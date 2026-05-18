// frontend/src/hooks/useSubmitReview.ts
// Mutation hook for submitting a product review.
// Calls POST /api/products/:productId/reviews for the first review,
// or POST /api/products/:productId/reviews/additional for extra reviews.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

/** Payload sent to the backend to create a review */
export interface SubmitReviewPayload {
  productId: string;
  rating: number; // 1-5
  comment?: string; // optional
  isAdditional?: boolean; // <-- added
}

/** The review object returned by the API */
export interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface SubmitReviewResponse {
  status: string;
  data: {
    review: Review;
  };
}

/**
 * React Query mutation for submitting a product review.
 *
 * On success, invalidates the order detail and shows a toast.
 */
export function useSubmitReview(): UseMutationResult<
  SubmitReviewResponse,
  Error,
  SubmitReviewPayload
> {
  const queryClient = useQueryClient();

  return useMutation<SubmitReviewResponse, Error, SubmitReviewPayload>({
    mutationFn: async (payload: SubmitReviewPayload) => {
      // Choose the endpoint based on whether it's an additional review
      const endpoint = payload.isAdditional
        ? `/products/${payload.productId}/reviews/additional`
        : `/products/${payload.productId}/reviews`;

      const { data } = await apiClient.post<SubmitReviewResponse>(endpoint, {
        rating: payload.rating,
        comment: payload.comment ?? '',
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Review submitted – thank you!');
      void queryClient.invalidateQueries({ queryKey: ['order'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit review');
      console.error('Submit review error:', error);
    },
  });
}
