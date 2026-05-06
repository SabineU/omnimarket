/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/webhook.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleStripeEvent } from '../../services/webhook.service.js';

// Mock the Stripe configuration module
vi.mock('../../config/stripe.js', () => {
  const mockConstructEvent = vi.fn();
  return {
    stripe: {
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    },
  };
});

// Mock the checkout service (completeCheckout)
vi.mock('../../services/checkout.service.js', () => {
  return {
    completeCheckout: vi.fn(),
  };
});

// Mock the config module (to provide webhook secret)
vi.mock('../../config.js', () => {
  return {
    config: {
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    },
  };
});

import { stripe } from '../../config/stripe.js';
import { completeCheckout } from '../../services/checkout.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleStripeEvent', () => {
  const rawBody = Buffer.from(
    JSON.stringify({ type: 'payment_intent.succeeded', data: { object: {} } }),
  );

  it('should verify the signature and call completeCheckout on success', async () => {
    // Mock the event that Stripe would construct
    const mockEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          metadata: { userId: 'user-1', addressId: 'addr-1' },
        },
      },
    };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent as any);
    vi.mocked(completeCheckout).mockResolvedValue({ order: { id: 'order-1' } } as any);

    await handleStripeEvent(rawBody, 'valid-signature');

    expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
      rawBody,
      'valid-signature',
      'whsec_test',
    );
    expect(completeCheckout).toHaveBeenCalledWith('user-1', 'pi_123');
  });

  it('should throw if signature verification fails', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await expect(handleStripeEvent(rawBody, 'bad-signature')).rejects.toThrow(
      'Webhook signature invalid',
    );

    expect(completeCheckout).not.toHaveBeenCalled();
  });

  it('should not call completeCheckout if userId is missing from metadata', async () => {
    const mockEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_456',
          metadata: {}, // no userId
        },
      },
    };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent as any);

    await handleStripeEvent(rawBody, 'sig');

    expect(completeCheckout).not.toHaveBeenCalled();
  });
});
