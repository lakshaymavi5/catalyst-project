import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { PricingService } from '../services/pricingService.js';
import { cache } from '../cache/index.js';

const router = Router();

// POST /api/estimate/calculate
router.post('/calculate', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deviceType, brand, faults, budget } = req.body;

    if (!deviceType || !brand || !Array.isArray(faults) || faults.length === 0) {
      res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST',
        message: 'Device type, brand, and at least one fault selection are required.'
      });
      return;
    }

    const numericBudget = Number(budget);
    if (isNaN(numericBudget) || numericBudget <= 0) {
      res.status(400).json({
        status: 'error',
        code: 'INVALID_BUDGET',
        message: 'Budget must be a positive number in INR.'
      });
      return;
    }

    // Cache key for pricing read-heavy queries
    const sortedFaults = [...faults].sort();
    const cacheKey = `estimate:${deviceType.toLowerCase()}:${brand.toLowerCase()}:${sortedFaults.join('+')}:${numericBudget}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.json({
        status: 'success',
        data: cached
      });
      return;
    }

    const result = await PricingService.calculateEstimate(
      deviceType,
      brand,
      faults,
      numericBudget
    );

    // Cache result with 30 min TTL (1800 seconds)
    await cache.set(cacheKey, result, 1800);

    res.setHeader('X-Cache', 'MISS');
    res.json({
      status: 'success',
      data: result
    });
  } catch (err: any) {
    // Safety-net fallback on server error with nearest emergency help line
    res.status(500).json({
      status: 'error',
      code: 'ESTIMATE_CALCULATION_FAILED',
      message: 'Failed to calculate bench estimate due to an internal server condition. Please retry or contact our central support desk.',
      supportContact: {
        phone: '+91 80 4932 7700',
        operatingHours: '09:00 AM to 07:00 PM IST (Mon-Sat)',
        email: 'estimates@repairassist.in'
      }
    });
  }
});

export default router;
