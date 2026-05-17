// frontend/src/pages/CheckoutPage.tsx
// Multi‑step checkout page: Address → Shipping → Payment.
// Uses React Hook Form for validation, Stripe Elements for card details,
// and React Query mutations for order creation.
import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStripe, useElements } from '@stripe/react-stripe-js';
import type { StripeCardElement } from '@stripe/stripe-js';
import { useCart } from '../hooks/useCart';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { Button, Spinner } from '../components/ui';
import AddressStep from '../components/checkout/AddressStep';
import ShippingStep from '../components/checkout/ShippingStep';
import PaymentStep from '../components/checkout/PaymentStep';
import StripeProvider from '../components/StripeProvider';

// ---------------------------------------------------------------------------
// Zod validation schema – only the address is required for now
// ---------------------------------------------------------------------------
const checkoutSchema = z.object({
  addressId: z.string().min(1, 'Please select a shipping address'),
});

/** TypeScript type inferred from the Zod schema */
export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

// ---------------------------------------------------------------------------
// Step labels (used for the progress bar)
// ---------------------------------------------------------------------------
const STEPS = ['Address', 'Shipping', 'Payment'] as const;

// ---------------------------------------------------------------------------
// Inner component – must be inside <Elements> to use Stripe hooks
// ---------------------------------------------------------------------------
function CheckoutForm(): React.JSX.Element {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  // Ref that will hold the CardElement instance, passed down to PaymentStep
  const cardElementRef = useRef<StripeCardElement | null>(null);

  // React Hook Form setup
  const methods = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { addressId: '' },
  });
  const { handleSubmit, trigger } = methods;

  // Which step is currently visible (0 = Address, 1 = Shipping, 2 = Payment)
  const [currentStep, setCurrentStep] = useState(0);

  // Cart data for the order summary sidebar
  const { data: cartData, isLoading: cartLoading } = useCart();
  const cartItems = cartData?.data.items ?? [];
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

  // Order mutation
  const createOrder = useCreateOrder();

  // ---- Step navigation ----

  const goToNextStep = async (): Promise<void> => {
    let isValid = false;
    if (currentStep === 0) {
      // Only validate the address field before advancing from step 0
      isValid = await trigger('addressId');
    } else {
      // Shipping and Payment have no required fields
      isValid = true;
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const goToPrevStep = (): void => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // ---- Final form submission ----

  const onSubmit = async (formData: CheckoutFormValues): Promise<void> => {
    if (!stripe || !elements || !cardElementRef.current) {
      // Stripe hasn't loaded yet – the submit button is disabled in this state
      return;
    }

    // The createOrder mutation sends the address and coupon to the backend.
    // The backend creates a PaymentIntent, which we then confirm with Stripe.
    createOrder.mutate(
      { addressId: formData.addressId },
      {
        onSuccess: (data) => {
          // Redirect to the order confirmation page
          navigate(`/orders/${data.data.order.id}`);
        },
        onError: (err) => {
          // In production, replace with a toast notification
          alert(err.message);
        },
      },
    );
  };

  // ---- Loading state ----
  if (cartLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="h-12 w-12" />
      </div>
    );
  }

  // ---- Empty cart (shouldn't happen, but defensive) ----
  if (cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link to="/products">
          <Button className="mt-4">Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8" data-testid="checkout-page">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-8">Checkout</h1>

      {/* ---- Progress bar ---- */}
      <nav aria-label="Progress" className="mb-10">
        <ol className="flex items-center justify-center gap-2">
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  index <= currentStep
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`ml-2 text-sm font-medium ${
                  index <= currentStep
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {label}
              </span>
              {index < STEPS.length - 1 && (
                <svg
                  className="mx-3 h-5 w-5 text-neutral-300 dark:text-neutral-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* ---- Two‑column layout: left = steps, right = order summary ---- */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left column: form steps */}
        <div className="lg:col-span-2">
          <FormProvider {...methods}>
            {/* eslint-disable-next-line react-hooks/refs -- the ref is only read during form submission, not during render */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Step content */}
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                {currentStep === 0 && <AddressStep />}
                {currentStep === 1 && <ShippingStep />}
                {currentStep === 2 && <PaymentStep stripeElementRef={cardElementRef} />}
              </div>

              {/* Navigation buttons */}
              <div className="mt-6 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPrevStep}
                  disabled={currentStep === 0}
                  data-testid="checkout-prev-button"
                >
                  Back
                </Button>

                {currentStep < STEPS.length - 1 ? (
                  <Button type="button" onClick={goToNextStep} data-testid="checkout-next-button">
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    loading={createOrder.isPending}
                    disabled={!stripe || !elements}
                    data-testid="checkout-place-order-button"
                  >
                    Place Order
                  </Button>
                )}
              </div>
            </form>
          </FormProvider>
        </div>

        {/* Right column: order summary */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Order Summary
            </h2>
            <ul className="space-y-3">
              {cartItems.map((item) => (
                <li key={item.id} className="flex gap-3 text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400 truncate flex-1">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    ${item.lineTotal.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <hr className="my-4 border-neutral-200 dark:border-neutral-700" />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CheckoutPage wrapper: provides Stripe Elements context
// ---------------------------------------------------------------------------
function CheckoutPage(): React.JSX.Element {
  return (
    <StripeProvider>
      <CheckoutForm />
    </StripeProvider>
  );
}

export default CheckoutPage;
