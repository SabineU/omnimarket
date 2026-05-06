// backend/src/services/webhook.service.ts
// Handles incoming Stripe webhook events.
// Verifies the signature, processes payment events, and finalises orders.
import { stripe } from '../config/stripe.js';
import { completeCheckout } from './checkout.service.js';
import { config } from '../config.js';
import type Stripe from 'stripe';

/**
 * Process a verified Stripe event.
 * For payment_intent.succeeded, finalise the checkout.
 */
export async function handleStripeEvent(rawBody: Buffer, signature: string): Promise<void> {
  // Ensure the webhook secret is configured
  if (!config.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }

  // 1. Verify the webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.STRIPE_WEBHOOK_SECRET, // now guaranteed to be a string
    );
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed.', err);
    throw new Error('Webhook signature invalid');
  }

  // 2. Handle the event type
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { userId } = paymentIntent.metadata;
      if (!userId) {
        console.error('No userId in PaymentIntent metadata');
        return;
      }

      try {
        const { order } = await completeCheckout(userId, paymentIntent.id);
        console.log(`✅ Order ${order.id} created from webhook`);
      } catch (err) {
        console.error('❌ Webhook order finalisation failed:', err);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`⚠️  Payment failed for PaymentIntent ${paymentIntent.id}`);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
