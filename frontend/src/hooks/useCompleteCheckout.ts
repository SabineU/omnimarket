// frontend/src/hooks/useCompleteCheckout.ts
// Mutation hook for STEP 3 of the checkout: completes the order after Stripe confirms payment.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Payload sent to the backend to complete the checkout */
export interface CompleteCheckoutPayload {
  stripePaymentIntentId: string;
}

/** Minimal order object returned by the API */
export interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
}

/** The full response from the complete checkout endpoint */
export interface CompleteCheckoutResponse {
  status: string;
  data: {
    order: Order;
  };
}

/**
 * React Query mutation for STEP 3 of the checkout flow.
 * Called AFTER stripe.confirmCardPayment() succeeds.
 * Sends the confirmed PaymentIntent ID to the backend so it can
 * create the order record, decrement stock, and clear the cart.
 *
 * On success, the cart query is invalidated so the UI updates.
 */
export function useCompleteCheckout(): UseMutationResult<
  CompleteCheckoutResponse,
  Error,
  CompleteCheckoutPayload
> {
  const queryClient = useQueryClient();

  return useMutation<CompleteCheckoutResponse, Error, CompleteCheckoutPayload>({
    mutationFn: async (payload: CompleteCheckoutPayload) => {
      const { data } = await apiClient.post<CompleteCheckoutResponse>(
        '/checkout/complete',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      // The cart is now empty – invalidate all cart queries so the
      // header badge, drawer, and cart page refetch automatically.
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
