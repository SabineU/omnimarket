// frontend/src/hooks/useCreateOrder.ts
// Mutation hook that submits the checkout form and creates an order.
// It calls the backend's checkout endpoints to create a PaymentIntent
// and then complete the order.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

/** Data sent to the backend to create a PaymentIntent */
interface CreatePaymentIntentPayload {
  addressId: string;
  couponCode?: string;
}

/** Response from the create-payment-intent endpoint */
interface PaymentIntentResponse {
  status: string;
  data: {
    clientSecret: string; // Stripe client secret for confirming the payment
    paymentIntentId: string; // The PaymentIntent ID
  };
}

/** Order returned by the complete checkout endpoint */
interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
}

interface CompleteCheckoutResponse {
  status: string;
  data: {
    order: Order;
  };
}

/**
 * React Query mutation that handles the two‑step checkout process:
 * 1. Create a Stripe PaymentIntent with the customer's address.
 * 2. Complete the checkout with the PaymentIntent ID.
 *
 * On success, the cart query is invalidated so the UI refetches.
 */
export function useCreateOrder(): UseMutationResult<
  CompleteCheckoutResponse,
  Error,
  CreatePaymentIntentPayload
> {
  const queryClient = useQueryClient();

  return useMutation<CompleteCheckoutResponse, Error, CreatePaymentIntentPayload>({
    mutationFn: async (payload: CreatePaymentIntentPayload) => {
      // Step 1: Create the PaymentIntent
      const { data: intentData } = await apiClient.post<PaymentIntentResponse>(
        '/checkout/create-payment-intent',
        payload,
      );

      // Step 2: Complete the checkout with the PaymentIntent ID
      const { data: completeData } = await apiClient.post<CompleteCheckoutResponse>(
        '/checkout/complete',
        { stripePaymentIntentId: intentData.data.paymentIntentId },
      );

      return completeData;
    },
    onSuccess: () => {
      // The cart is now empty, so invalidate all cart queries
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
