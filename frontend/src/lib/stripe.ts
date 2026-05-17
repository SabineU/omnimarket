// frontend/src/lib/stripe.ts
// Loads the Stripe.js library using the publishable key from environment variables.
import { loadStripe, type Stripe } from '@stripe/stripe-js';

/**
 * A cached Promise that resolves to the Stripe instance.
 * loadStripe only needs to be called once.
 */
let stripePromise: Promise<Stripe | null>;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    // IMPORTANT: VITE_STRIPE_PUBLISHABLE_KEY must be set in your .env file
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);
  }
  return stripePromise;
}
