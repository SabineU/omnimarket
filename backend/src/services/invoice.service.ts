// backend/src/services/invoice.service.ts
// Generates a PDF invoice for an order (only the owner can generate it).
import { prisma } from '../db.js';
import PDFDocument from 'pdfkit';

/**
 * Create an invoice PDF and return it as a Buffer.
 * @param orderId – the order to invoice
 * @param userId  – the authenticated user requesting the invoice
 * @returns the PDF binary data
 * @throws if the order does not exist or does not belong to the user
 */
export async function generateInvoiceBuffer(orderId: string, userId: string): Promise<Buffer> {
  // 1. Fetch the order with all details needed for the invoice
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true } },
      shippingAddress: true,
      items: {
        include: {
          product: {
            select: {
              name: true,
              seller: { select: { storeName: true } }, // seller via product
            },
          },
          variation: {
            select: { sku: true, size: true, color: true },
          },
        },
      },
    },
  });

  if (!order || order.customerId !== userId) {
    throw new Error('Order not found');
  }

  // 2. Create a new PDF document and collect the output in a buffer
  const doc = new PDFDocument({ margin: 50 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  // 3. Build the invoice content
  const leftMargin = 50;

  // --- Header ---
  doc.fontSize(20).font('Helvetica-Bold').text('OmniMarket', leftMargin, 50);
  doc.fontSize(10).font('Helvetica').text('Invoice', leftMargin, 80);
  doc
    .fontSize(8)
    .text(`Order ID: ${order.id}`, leftMargin, 105)
    .text(`Date: ${order.createdAt.toISOString().slice(0, 10)}`, leftMargin, 115)
    .text(`Customer: ${order.customer.name} (${order.customer.email})`, leftMargin, 125);

  // Shipping address
  const addr = order.shippingAddress;
  doc.text(
    `Shipping Address: ${addr.street}, ${addr.city}, ${addr.zipCode}, ${addr.country}`,
    leftMargin,
    140,
  );

  // --- Line items table ---
  let y = 170;
  doc.font('Helvetica-Bold').fontSize(8);
  doc.text('Product', leftMargin, y, { width: 200 });
  doc.text('Seller', leftMargin + 200, y, { width: 100 });
  doc.text('Qty', leftMargin + 300, y, { width: 30 });
  doc.text('Unit Price', leftMargin + 330, y, { width: 60 });
  doc.text('Line Total', leftMargin + 390, y, { width: 70 });
  y += 12;

  // Draw a line
  doc.moveTo(leftMargin, y).lineTo(550, y).stroke();
  y += 8;

  doc.font('Helvetica').fontSize(8);
  for (const item of order.items) {
    const productName = item.product.name;
    const variationInfo = item.variation
      ? `${item.variation.sku} (${item.variation.color ?? ''} ${item.variation.size ?? ''})`
      : '';
    const sellerName = item.product.seller?.storeName ?? 'N/A';
    const unitPrice = Number(item.priceAtTime);
    const lineTotal = unitPrice * item.quantity;

    doc.text(`${productName} ${variationInfo}`, leftMargin, y, { width: 200 });
    doc.text(sellerName, leftMargin + 200, y, { width: 100 });
    doc.text(String(item.quantity), leftMargin + 300, y, { width: 30 });
    doc.text(unitPrice.toFixed(2), leftMargin + 330, y, { width: 50 });
    doc.text(lineTotal.toFixed(2), leftMargin + 390, y, { width: 70 });
    y += 14;

    if (y > 700) {
      doc.addPage();
      y = 50;
    }
  }

  // --- Totals ---
  y += 15;
  doc.moveTo(leftMargin, y).lineTo(550, y).stroke();
  y += 10;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text(`Total: $${Number(order.totalAmount).toFixed(2)}`, leftMargin + 390, y, {
    width: 100,
    align: 'right',
  });

  // --- Footer ---
  doc.fontSize(7).font('Helvetica').text('Thank you for shopping with OmniMarket!', 50, 750, {
    align: 'center',
    width: 500,
  });

  // 4. Set up the Promise that resolves when the PDF stream ends,
  //    then finalise the document. This order is crucial: we must
  //    start listening for 'end' before calling doc.end().
  const resultPromise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });

  doc.end();

  return resultPromise;
}
