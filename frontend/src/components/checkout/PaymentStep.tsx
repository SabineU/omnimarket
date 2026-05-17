// frontend/src/components/checkout/PaymentStep.tsx
// Step 3: Payment information collected via Stripe Elements.
// The CardElement is a secure iframe that never exposes raw card data.
import { CardElement } from '@stripe/react-stripe-js';
import type { StripeCardElement } from '@stripe/stripe-js';

interface PaymentStepProps {
  /** Ref to store the CardElement instance so the parent can call
   *  stripe.createPaymentMethod on submission. */
  stripeElementRef: React.MutableRefObject<StripeCardElement | null>;
}

function PaymentStep({ stripeElementRef }: PaymentStepProps): React.JSX.Element {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        Payment Details
      </legend>
      <div className="rounded-lg border border-neutral-300 dark:border-neutral-600 p-4">
        <CardElement
          // Store the element instance in the parent's ref when it's ready
          onReady={(element) => {
            stripeElementRef.current = element;
          }}
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#1f2937',
                '::placeholder': { color: '#9ca3af' },
              },
              invalid: { color: '#ef4444' },
            },
          }}
        />
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
        Your payment information is processed securely by Stripe. We never store your card details.
      </p>
    </fieldset>
  );
}

export default PaymentStep;
