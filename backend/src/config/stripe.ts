// backend/src/config/stripe.ts
// Initialises the Stripe SDK with the secret key from environment.
import Stripe from 'stripe';
import { config } from '../config.js';

// Create a Stripe instance only if the secret key is provided.
// In tests, the key may be empty – we mock the library.
const stripe = config.STRIPE_SECRET_KEY
  ? new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia', // latest stable API version
    })
  : ({} as Stripe); // placeholder (will be mocked in tests)

export { stripe };
