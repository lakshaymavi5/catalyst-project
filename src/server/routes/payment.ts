import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';

const router = Router();

const PAYMENT_MODES = ['online', 'at_centre', 'pay_later'] as const;
type PaymentMode = typeof PAYMENT_MODES[number];

// Payment records kept in memory until the payments table is added to the database.
const paymentRecords = new Map<string, unknown>();

function toPaise(value: number): number {
  return Math.round(value * 100);
}

// POST /api/payment/confirm
// No money is ever marked as received here. "at_centre" and "pay_later" create a
// booking with status "pending". Online payment is refused until a real gateway is connected.
router.post('/confirm', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { requestId, paymentMode, repairMode, amount } = req.body;

    if (typeof requestId !== 'string' || !PAYMENT_MODES.includes(paymentMode as PaymentMode)) {
      res.status(400).json({
        status: 'error',
        code: 'MISSING_DATA',
        message: 'Order reference and a valid payment mode are required.'
      });
      return;
    }

    const order = await db.getRepairRequest(requestId);
    if (!order) {
      res.status(404).json({
        status: 'error',
        code: 'ORDER_NOT_FOUND',
        message: 'We could not find this order. Please regenerate your bill.'
      });
      return;
    }

    if (order.user_id !== user.id) {
      res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'You can only pay for your own orders.'
      });
      return;
    }

    if (order.status === 'booked') {
      res.status(409).json({
        status: 'error',
        code: 'ALREADY_CONFIRMED',
        message: 'This order has already been booked.'
      });
      return;
    }

    // The amount is taken from the saved order, never from the client.
    // A client-sent amount is only accepted if it matches exactly.
    const expectedPaise = toPaise(order.grand_total);
    if (toPaise(Number(amount)) !== expectedPaise) {
      res.status(400).json({
        status: 'error',
        code: 'AMOUNT_MISMATCH',
        message: 'The payment amount does not match your bill. Please go back and regenerate it.'
      });
      return;
    }

    if (paymentMode === 'online') {
      if (!process.env.PAYMENT_GATEWAY_KEY) {
        res.status(503).json({
          status: 'error',
          code: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
          message: 'Online payment is not available yet. Please choose pay at the centre or pay when repaired.'
        });
        return;
      }
      // Gateway integration goes here. Create the gateway order, then mark the
      // payment as successful only after the gateway signature is verified.
      res.status(501).json({
        status: 'error',
        code: 'GATEWAY_NOT_IMPLEMENTED',
        message: 'Online payment integration is not finished.'
      });
      return;
    }

    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const paidAt = new Date().toISOString();
    const message = paymentMode === 'at_centre'
      ? 'Slot booked. Please pay at the service centre.'
      : 'Repair order saved. Pay when the technician collects your device.';

    paymentRecords.set(transactionId, {
      transactionId,
      requestId: order.id,
      userId: user.id,
      paymentMode,
      repairMode: repairMode ?? null,
      amount: order.grand_total,
      status: 'pending',
      createdAt: paidAt
    });

    await db.updateTicketStatus(order.id, 'booked');

    res.json({
      status: 'success',
      data: {
        transactionId,
        requestId: order.id,
        paymentMode,
        repairMode: repairMode ?? null,
        amount: order.grand_total,
        paidAt,
        status: 'pending',
        message
      }
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      code: 'PAYMENT_FAILED',
      message: 'Payment processing encountered an issue. Please try again or call the service centre.'
    });
  }
});

export default router;
