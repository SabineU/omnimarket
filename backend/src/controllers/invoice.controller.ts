// backend/src/controllers/invoice.controller.ts
// Handles HTTP requests for invoice download.
import type { Request, Response, NextFunction } from 'express';
import * as invoiceService from '../services/invoice.service.js';

/** Extract authenticated user's ID */
function getUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw new Error('Authentication required');
  return userId;
}

/** Extract a single route parameter safely */
function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

/**
 * GET /api/orders/:id/invoice
 * Returns the invoice PDF for the given order.
 */
export async function getInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const orderId = getParam(req, 'id');
    const pdfBuffer = await invoiceService.generateInvoiceBuffer(orderId, userId);

    // Set headers to force download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderId}.pdf"`);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}
