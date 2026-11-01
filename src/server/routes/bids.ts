import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, RepairRequest } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { PricingService } from '../services/pricingService.js';

const router = Router();

const PIN_PATTERN = /^\d{6}$/;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function requireRole(role: 'customer' | 'repairman') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) {
      res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN_ROLE',
        message: role === 'repairman'
          ? 'Only registered repair specialists can access this.'
          : 'Only device owners can access this.'
      });
      return;
    }
    next();
  };
}

// Repairmen get enough detail to quote. The customer's name, phone and serial
// number stay hidden until the customer accepts a bid.
function repairmanTicketView(t: RepairRequest) {
  return {
    id: t.id,
    device_type: t.device_type,
    brand: t.brand,
    product_name: t.product_name,
    model_number: t.model_number,
    fault_types: t.fault_types,
    budget_inr: t.budget_inr,
    pin_code: t.pin_code,
    city: t.city,
    status: t.status,
    created_at: t.created_at
  };
}

// GET /api/bids/tickets : open requests in the repairman's own city
router.get('/tickets', requireAuth, requireRole('repairman'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shop = req.user!;
    if (!shop.shop_city) {
      res.json({ status: 'success', data: [] });
      return;
    }

    const deviceType = typeof req.query.deviceType === 'string' ? req.query.deviceType : undefined;
    const tickets = await db.getOpenTickets({ deviceType, city: shop.shop_city });

    const data = await Promise.all(
      tickets.map(async (t) => {
        const bids = await db.getBidsForTicket(t.id);
        // Competing prices are not shown to other repairmen
        return {
          ...repairmanTicketView(t),
          bidCount: bids.length
        };
      })
    );

    res.json({ status: 'success', data });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      code: 'TICKETS_FETCH_FAILED',
      message: 'Unable to retrieve marketplace tickets.'
    });
  }
});

// GET /api/bids/ticket/:ticketId : the customer who owns the ticket sees its quotes
router.get('/ticket/:ticketId', requireAuth, requireRole('customer'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticket = await db.getRepairRequest(req.params.ticketId as string);

    if (!ticket) {
      res.status(404).json({
        status: 'error',
        code: 'TICKET_NOT_FOUND',
        message: 'The requested repair ticket was not found.'
      });
      return;
    }

    if (ticket.user_id !== req.user!.id) {
      res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'You can only view quotes on your own repair requests.'
      });
      return;
    }

    const bids = await db.getBidsForTicket(ticket.id);

    res.json({
      status: 'success',
      data: { ticket, bids }
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      code: 'BIDS_FETCH_FAILED',
      message: 'Unable to fetch repair offers.'
    });
  }
});

// POST /api/bids/publish-ticket : a customer posts a repair request to local shops.
// The server creates the ID, validates the PIN, and calculates the price itself.
router.post('/publish-ticket', requireAuth, requireRole('customer'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = req.user!;
    const {
      deviceType = 'smartphone',
      brand,
      productName,
      modelNumber,
      serialNumber,
      faults,
      budget,
      pinCode,
      photoUrl
    } = req.body;

    if (typeof brand !== 'string' || !Array.isArray(faults) || faults.length === 0 || !faults.every(f => typeof f === 'string')) {
      res.status(400).json({
        status: 'error',
        code: 'MISSING_FIELDS',
        message: 'Brand and at least one fault are required.'
      });
      return;
    }

    const pin = typeof pinCode === 'string' ? pinCode.trim() : '';
    if (!PIN_PATTERN.test(pin)) {
      res.status(400).json({
        status: 'error',
        code: 'INVALID_PIN_FORMAT',
        message: 'PIN code must be exactly 6 numeric digits.'
      });
      return;
    }

    const pinRecord = await db.getServiceablePin(pin);
    if (!pinRecord || !pinRecord.is_active) {
      res.status(400).json({
        status: 'error',
        code: 'UNSERVICEABLE_PIN',
        message: 'This PIN code is not in our service network.'
      });
      return;
    }

    const numericBudget = Number(budget);
    if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
      res.status(400).json({
        status: 'error',
        code: 'INVALID_BUDGET',
        message: 'Budget must be a positive number in INR.'
      });
      return;
    }

    const estimate = await PricingService.calculateEstimate(deviceType, brand, faults, numericBudget);
    const subtotal = estimate.originalRepair.subtotal;
    const gst = PricingService.calculateGst(subtotal);

    const ticket = await db.saveRepairRequest({
      id: `req_${crypto.randomBytes(6).toString('hex')}`,
      user_id: customer.id,
      customer_name: customer.full_name,
      customer_phone: customer.phone,
      device_photo_url: typeof photoUrl === 'string' ? photoUrl : '',
      device_type: deviceType,
      brand,
      product_name: typeof productName === 'string' && productName.trim() ? productName.trim() : 'Unknown Model',
      model_number: typeof modelNumber === 'string' && modelNumber.trim() ? modelNumber.trim() : 'N/A',
      serial_number: typeof serialNumber === 'string' && serialNumber.trim() ? serialNumber.trim() : 'N/A',
      fault_types: faults,
      budget_inr: numericBudget,
      pin_code: pin,
      city: pinRecord.city,
      service_centre_id: pinRecord.service_centre_id,
      selected_option: 'repair_marketplace_bid',
      subtotal,
      gst_amount: gst.totalGstAmount,
      grand_total: gst.grandTotal,
      status: 'open_for_bids',
      created_at: new Date().toISOString()
    });

    res.json({ status: 'success', data: ticket });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      code: 'PUBLISH_FAILED',
      message: 'Failed to publish repair ticket to marketplace.'
    });
  }
});

// POST /api/bids/submit : a repairman quotes on an open request in their city
router.post('/submit', requireAuth, requireRole('repairman'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shop = req.user!;
    const { ticketId, bidPrice, partsCost, turnaroundDays, warrantyDays, repairApproach } = req.body;

    if (typeof ticketId !== 'string' || typeof repairApproach !== 'string' || repairApproach.trim().length < 10) {
      res.status(400).json({
        status: 'error',
        code: 'MISSING_FIELDS',
        message: 'Ticket ID and a repair methodology of at least 10 characters are required.'
      });
      return;
    }

    const price = Number(bidPrice);
    if (!Number.isFinite(price) || price <= 0) {
      res.status(400).json({
        status: 'error',
        code: 'INVALID_PRICE',
        message: 'Offered price must be a positive amount in INR.'
      });
      return;
    }

    const ticket = await db.getRepairRequest(ticketId);
    if (!ticket) {
      res.status(404).json({
        status: 'error',
        code: 'TICKET_NOT_FOUND',
        message: 'Target repair request does not exist.'
      });
      return;
    }

    if (ticket.status !== 'open_for_bids') {
      res.status(409).json({
        status: 'error',
        code: 'TICKET_CLOSED',
        message: 'This request is no longer accepting quotes.'
      });
      return;
    }

    if (ticket.city && shop.shop_city && ticket.city.toLowerCase() !== shop.shop_city.toLowerCase()) {
      res.status(403).json({
        status: 'error',
        code: 'OUT_OF_AREA',
        message: 'You can only quote on requests in your city.'
      });
      return;
    }

    const existing = (await db.getBidsForTicket(ticket.id)).find(b => b.repairman_id === shop.id);
    if (existing) {
      res.status(409).json({
        status: 'error',
        code: 'ALREADY_BID',
        message: 'You have already submitted a quote on this request.'
      });
      return;
    }

    const parts = partsCost !== undefined && Number.isFinite(Number(partsCost))
      ? Number(partsCost)
      : Math.round(price * 0.7 * 100) / 100;
    if (parts < 0 || parts > price) {
      res.status(400).json({
        status: 'error',
        code: 'INVALID_SPLIT',
        message: 'Parts cost must be between zero and the total offered price.'
      });
      return;
    }
    const labour = Math.round((price - parts) * 100) / 100;

    const bid = await db.createBid({
      id: `bid_${crypto.randomBytes(6).toString('hex')}`,
      ticket_id: ticket.id,
      repairman_id: shop.id,
      repairman_name: shop.full_name,
      shop_name: shop.shop_name || `${shop.full_name}'s Workshop`,
      shop_address: shop.shop_address || '',
      shop_city: shop.shop_city || '',
      shop_pin: shop.shop_pin || ticket.pin_code,
      shop_phone: shop.shop_phone || shop.phone,
      bid_price: price,
      parts_cost: parts,
      labour_cost: labour,
      turnaround_days: clamp(Number(turnaroundDays) || 1, 1, 14),
      warranty_days: clamp(Number(warrantyDays) || 90, 30, 365),
      repair_approach: repairApproach.trim(),
      status: 'pending'
    });

    res.status(201).json({ status: 'success', data: bid });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      code: 'BID_SUBMISSION_FAILED',
      message: 'Failed to submit quote.'
    });
  }
});

// POST /api/bids/accept : the owning customer accepts a bid that belongs to their ticket
router.post('/accept', requireAuth, requireRole('customer'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = req.user!;
    const { ticketId, bidId } = req.body;

    if (typeof ticketId !== 'string' || typeof bidId !== 'string') {
      res.status(400).json({
        status: 'error',
        code: 'MISSING_DATA',
        message: 'Both ticket ID and bid ID are required to accept an offer.'
      });
      return;
    }

    const ticket = await db.getRepairRequest(ticketId);
    if (!ticket) {
      res.status(404).json({
        status: 'error',
        code: 'TICKET_NOT_FOUND',
        message: 'The requested repair ticket was not found.'
      });
      return;
    }

    if (ticket.user_id !== customer.id) {
      res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'You can only accept quotes on your own repair requests.'
      });
      return;
    }

    if (ticket.status !== 'open_for_bids') {
      res.status(409).json({
        status: 'error',
        code: 'TICKET_CLOSED',
        message: 'A quote has already been accepted for this request.'
      });
      return;
    }

    // The bid must belong to this ticket, so a customer cannot accept a bid on someone else's request
    const bid = (await db.getBidsForTicket(ticket.id)).find(b => b.id === bidId);
    if (!bid) {
      res.status(404).json({
        status: 'error',
        code: 'BID_NOT_ON_TICKET',
        message: 'That quote does not belong to this repair request.'
      });
      return;
    }

    const result = await db.acceptBid(ticket.id, bid.id);
    res.json({ status: 'success', data: result });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      code: 'ACCEPT_BID_FAILED',
      message: 'Unable to accept shop offer.'
    });
  }
});

// GET /api/bids/my-bids : a repairman's own quotes
router.get('/my-bids', requireAuth, requireRole('repairman'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shop = req.user!;
    const bids = await db.getBidsByRepairman(shop.id);

    const data = await Promise.all(
      bids.map(async (b) => {
        const ticket = await db.getRepairRequest(b.ticket_id);
        return {
          ...b,
          ticket: ticket ? repairmanTicketView(ticket) : null
        };
      })
    );

    res.json({ status: 'success', data });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      code: 'MY_BIDS_FAILED',
      message: 'Unable to fetch your submitted bids.'
    });
  }
});

export default router;
