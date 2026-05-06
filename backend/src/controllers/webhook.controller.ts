// backend/src/controllers/webhook.controller.ts
// Handles incoming Stripe webhook requests.
import type { Request, Response, NextFunction } from 'express';
import * as webhookService from '../services/webhook.service.js';

/**
 * POST /api/webhooks/stripe
 * Receives raw body and Stripe-Signature header.
 */
export async function handleWebhook(
  req: Request,
  res: Response,
  _next: NextFunction, // <-- prefixed with _ to indicate intentionally unused
): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      res.status(400).json({ message: 'Missing Stripe signature header' });
      return;
    }

    // req.body is a Buffer because we used express.raw() middleware on this route
    const rawBody = req.body as Buffer;

    await webhookService.handleStripeEvent(rawBody, signature);

    // Always return 200 quickly, even if processing fails internally
    res.status(200).json({ received: true });
  } catch (error) {
    // Log but still return 200 to Stripe (prevents retries for verification failures)
    console.error('Webhook error:', error);
    res.status(400).json({ message: 'Webhook verification failed' });
  }
}
