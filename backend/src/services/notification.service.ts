// backend/src/services/notification.service.ts
// Order notification service.
// Currently logs to console – ready to be replaced with real email (SendGrid, etc.).

/**
 * Simulate sending an order confirmation to the customer.
 * @param userId   the customer's ID
 * @param orderId  the newly created order ID
 */
export async function sendCustomerOrderConfirmation(
  userId: string,
  orderId: string,
): Promise<void> {
  // In production: fetch user email, send email via SendGrid
  console.log(`📧 [CUSTOMER] Order confirmation for user ${userId}, order ${orderId}`);
}

/**
 * Simulate notifying a seller about a new order containing their items.
 * @param sellerId   the seller's user ID
 * @param orderId    the newly created order ID
 */
export async function sendSellerNewOrderNotification(
  sellerId: string,
  orderId: string,
): Promise<void> {
  // In production: fetch seller email, send email with order details
  console.log(`📦 [SELLER] New order notification for seller ${sellerId}, order ${orderId}`);
}
