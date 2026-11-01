import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { ReplacementService } from '../services/replacementService.js';
import { cache } from '../cache/index.js';

const router = Router();

// POST /api/replacements/recommend
router.post('/recommend', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deviceType, budget, faults, repairSubtotal } = req.body;

    if (!deviceType || budget === undefined || !Array.isArray(faults)) {
      res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST',
        message: 'Device type, budget, and faults array are required.'
      });
      return;
    }

    const numericBudget = Number(budget);
    const numericRepairSubtotal = Number(repairSubtotal) || 0;

    const cacheKey = `replacements:${deviceType.toLowerCase()}:${numericBudget}:${numericRepairSubtotal}:${[...faults].sort().join('+')}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.json({
        status: 'success',
        data: cached
      });
      return;
    }

    const recommendation = await ReplacementService.getRecommendation(
      deviceType,
      numericBudget,
      faults,
      numericRepairSubtotal
    );

    // Cache with 30 min TTL
    await cache.set(cacheKey, recommendation, 1800);

    res.setHeader('X-Cache', 'MISS');
    res.json({
      status: 'success',
      data: recommendation
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      code: 'REPLACEMENT_RECOMMENDATION_FAILED',
      message: err.message || 'Unable to retrieve replacement recommendations.'
    });
  }
});

export default router;
