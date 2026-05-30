// admin-frontend/src/hooks/useApproveSeller.ts
// Mutation hook for approving or rejecting a seller.
// Calls PATCH /api/admin/sellers/:userId with { isApproved: boolean }.

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Payload sent to the backend to update a seller's approval status */
export interface ApproveSellerPayload {
  userId: string; // The seller's user ID
  isApproved: boolean; // true = approve, false = reject
}

/** Minimal seller profile returned after update */
interface SellerProfileResponse {
  status: string;
  data: {
    profile: {
      userId: string;
      isApproved: boolean;
      storeName: string;
    };
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Mutation hook to approve or reject a seller.
 *
 * On success:
 * - Shows a success toast ("Seller approved" or "Seller rejected")
 * - Invalidates the ['admin-sellers'] query so the table refreshes automatically
 *
 * On error:
 * - Shows an error toast with the failure message
 *
 * Usage:
 *   const approveSeller = useApproveSeller();
 *   approveSeller.mutate({ userId: 'abc-123', isApproved: true });
 */
export function useApproveSeller(): UseMutationResult<
  SellerProfileResponse,
  Error,
  ApproveSellerPayload
> {
  // queryClient lets us invalidate (mark as stale) cached queries
  const queryClient = useQueryClient();

  return useMutation<SellerProfileResponse, Error, ApproveSellerPayload>({
    // The function that performs the actual API call
    mutationFn: async (payload: ApproveSellerPayload) => {
      const { data } = await apiClient.patch<SellerProfileResponse>(
        `/admin/sellers/${payload.userId}`,
        { isApproved: payload.isApproved },
      );
      return data;
    },

    // Called when the API call succeeds
    onSuccess: (_data, variables) => {
      // Show a user‑friendly toast message
      const action = variables.isApproved ? 'approved' : 'rejected';
      toast.success(`Seller ${action} successfully`);

      // Invalidate all admin-sellers queries so the table refetches
      // with updated approval statuses
      void queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
    },

    // Called when the API call fails
    onError: (error) => {
      toast.error(error.message || 'Failed to update seller status');
      console.error('Approve seller error:', error);
    },
  });
}
