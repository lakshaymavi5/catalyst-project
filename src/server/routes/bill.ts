import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { PricingService } from '../services/pricingService.js';
import { db } from '../db/index.js';

const router = Router();

// POST /api/bill/generate
router.post('/generate', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      optionType, // 'repair_original' | 'repair_cheaper' | 'replacement' | 'repair_marketplace_bid'
      deviceType,
      brand,
      productName,
      modelNumber,
      serialNumber,
      faults,
      budget,
      pinCode,
      photoUrl,
      replacementDetails,
      acceptedBid
    } = req.body;

    if (!optionType || !deviceType || !pinCode) {
      res.status(400).json({
        status: 'error',
        code: 'MISSING_DATA',
        message: 'Required order details are missing.'
      });
      return;
    }

    // Lookup service centre by PIN
    const serviceCentre = await db.getServiceCentreByPin(pinCode);
    const centreId = serviceCentre ? serviceCentre.id : 'sc_blr_01';
    let centreDetails = serviceCentre || await db.getServiceCentreById('sc_blr_01');

    // Calculate itemised figures
    let billData;

    if (optionType === 'repair_marketplace_bid' && acceptedBid) {
      centreDetails = {
        id: `shop_${acceptedBid.repairman_id || 'local'}`,
        name: acceptedBid.shop_name,
        address: acceptedBid.shop_address,
        city: acceptedBid.shop_city || 'Bengaluru',
        state: 'Karnataka',
        pin_code: acceptedBid.shop_pin || pinCode,
        phone: acceptedBid.shop_phone,
        email: 'workshop@repairassist.in',
        operating_hours: '10:00 AM to 07:30 PM (Mon-Sat)',
        rating: 4.9
      };

      const parts = Number(acceptedBid.parts_cost) || Math.round(Number(acceptedBid.bid_price) * 0.7);
      const labour = Number(acceptedBid.labour_cost) || (Number(acceptedBid.bid_price) - parts);
      const subtotal = parts + labour;
      const gst = PricingService.calculateGst(subtotal);

      billData = {
        items: [
          {
            description: `Tier-1 Replacement Hardware Component (${acceptedBid.repair_approach || 'Direct module swap'})`,
            category: 'part' as const,
            unitPrice: parts,
            quantity: 1,
            total: parts
          },
          {
            description: `Precision Bench Repair Labour (${acceptedBid.shop_name})`,
            category: 'labour' as const,
            unitPrice: labour,
            quantity: 1,
            total: labour
          },
          {
            description: `Local Diagnostic Assessment Fee (Waived by ${acceptedBid.shop_name})`,
            category: 'diagnostic' as const,
            unitPrice: 0,
            quantity: 1,
            total: 0
          }
        ],
        subtotal,
        cgstRate: 0.09,
        cgstAmount: gst.cgstAmount,
        sgstRate: 0.09,
        sgstAmount: gst.sgstAmount,
        totalGstRate: 0.18,
        totalGstAmount: gst.totalGstAmount,
        grandTotal: gst.grandTotal
      };
    } else {
      let estimateResult;
      if (optionType === 'repair_original' || optionType === 'repair_cheaper') {
        estimateResult = await PricingService.calculateEstimate(
          deviceType,
          brand || 'Generic',
          faults || ['screen_crack'],
          Number(budget) || 10000
        );
      }

      billData = PricingService.generateBillDetails(
        optionType,
        estimateResult,
        replacementDetails?.price,
        replacementDetails?.name
      );
    }

    const invoiceNumber = `INV-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Store quote in database
    const savedRequest = await db.saveRepairRequest({
      id: `req_${crypto.randomBytes(6).toString('hex')}`,
      user_id: req.user!.id,
      device_photo_url: photoUrl || '',
      device_type: deviceType,
      brand: brand || 'Generic',
      product_name: productName || 'Unknown Model',
      model_number: modelNumber || 'N/A',
      serial_number: serialNumber || 'N/A',
      fault_types: faults || [],
      budget_inr: Number(budget) || 0,
      pin_code: pinCode,
      service_centre_id: centreId,
      selected_option: optionType,
      subtotal: billData.subtotal,
      gst_amount: billData.totalGstAmount,
      grand_total: billData.grandTotal,
      status: 'confirmed',
      created_at: new Date().toISOString()
    });

    res.json({
      status: 'success',
      data: {
        invoiceNumber,
        requestId: savedRequest.id,
        invoiceDate: new Date().toISOString(),
        customer: {
          name: req.user!.full_name,
          email: req.user!.email,
          phone: req.user!.phone
        },
        device: {
          deviceType,
          brand,
          productName,
          modelNumber,
          serialNumber,
          photoUrl
        },
        serviceCentre: centreDetails,
        bill: billData
      }
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      code: 'BILL_GENERATION_FAILED',
      message: 'Failed to generate final itemised bill due to a processing timeout.',
      fallbackSupport: {
        nearestCentrePhone: '+91 80 4932 7700',
        nearestCentreName: 'Indiranagar Central Service Hub',
        address: '1204 100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru 560038',
        hours: '09:30 AM to 07:00 PM IST (Mon-Sat)'
      }
    });
  }
});

export default router;
