// backend/src/services/notification.service.ts
// Order notification service.
// Sends real transactional emails via SendGrid when configured,
// otherwise falls back to console logs.
import { sendEmail } from './email.service.js';
import { prisma } from '../db.js';

/**
 * Send an order confirmation email to the customer.
 * Fetches the customer's email from the database, then sends the email.
 * @param userId   the customer's user ID
 * @param orderId  the newly created order ID
 */
export async function sendCustomerOrderConfirmation(
  userId: string,
  orderId: string,
): Promise<void> {
  try {
    // Fetch the customer's email address from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      console.error(`Cannot send confirmation: user ${userId} not found`);
      return;
    }

    await sendEmail({
      to: user.email,
      subject: `Order #${orderId.slice(0, 8).toUpperCase()} confirmed!`,
      text: `Hi ${user.name},\n\nYour order #${orderId.slice(0, 8)} has been confirmed. Thank you for shopping with OmniMarket!`,
      html: `<p>Hi ${user.name},</p><p>Your order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> has been confirmed.</p><p>Thank you for shopping with OmniMarket!</p>`,
    });
  } catch (error) {
    console.error('Failed to send order confirmation:', error);
  }
}

/**
 * Send a notification to a seller that they have a new order.
 * @param sellerId   the seller's user ID
 * @param orderId    the newly created order ID
 */
export async function sendSellerNewOrderNotification(
  sellerId: string,
  orderId: string,
): Promise<void> {
  try {
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { email: true, name: true },
    });

    if (!seller) {
      console.error(`Cannot notify seller: user ${sellerId} not found`);
      return;
    }

    await sendEmail({
      to: seller.email,
      subject: `New order #${orderId.slice(0, 8).toUpperCase()} received!`,
      text: `Hi ${seller.name},\n\nYou have received a new order (#${orderId.slice(0, 8)}) on OmniMarket. Log in to your seller portal to manage it.`,
      html: `<p>Hi ${seller.name},</p><p>You have received a new order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> on OmniMarket.</p><p><a href="http://localhost:5174/orders">View your orders</a></p>`,
    });
  } catch (error) {
    console.error('Failed to notify seller:', error);
  }
}
