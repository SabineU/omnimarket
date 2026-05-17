// frontend/src/hooks/useCreateOrder.ts
// Mutation hook for STEP 1 of the checkout: creates a Stripe PaymentIntent.
// Returns the clientSecret and paymentIntentId needed for client‑side confirmation.
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Data sent to the backend to create a PaymentIntent */
export interface CreatePaymentIntentPayload {
  addressId: string;
  couponCode?: string;
}

/** Data returned by the backend after creating a PaymentIntent */
export interface PaymentIntentData {
  clientSecret: string; // Used by stripe.confirmCardPayment() on the client
  paymentIntentId: string; // The PaymentIntent ID, saved for the completion step
}

interface PaymentIntentResponse {
  status: string;
  data: PaymentIntentData;
}

/**
 * React Query mutation for STEP 1 of the checkout flow.
 * It sends the customer's address (and optional coupon) to the backend,
 * which creates a Stripe PaymentIntent and returns its client secret.
 *
 * The actual card confirmation happens in the component using
 * stripe.confirmCardPayment() – this hook only handles the backend call.
 */
export function useCreateOrder(): UseMutationResult<
  PaymentIntentData,
  Error,
  CreatePaymentIntentPayload
> {
  return useMutation<PaymentIntentData, Error, CreatePaymentIntentPayload>({
    mutationFn: async (payload: CreatePaymentIntentPayload) => {
      const { data } = await apiClient.post<PaymentIntentResponse>(
        '/checkout/create-payment-intent',
        payload,
      );
      // Return only the data we need: clientSecret and paymentIntentId
      return data.data;
    },
  });
}
