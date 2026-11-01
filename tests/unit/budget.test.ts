import { describe, it, expect, beforeAll } from 'vitest';
import { PricingService } from '../../src/server/services/pricingService.js';
import { ReplacementService } from '../../src/server/services/replacementService.js';
import { db } from '../../src/server/db/index.js';

describe('Budget Comparison & Decision Matrix', () => {
  beforeAll(async () => {
    await db.init();
  });

  it('correctly flags repairs that exceed customer budget', async () => {
    const result = await PricingService.calculateEstimate(
      'smartphone',
      'Apple',
      ['liquid_damage'],
      15000 // Budget is 15000, repair subtotal is 26000 + 2800 = 28800
    );

    expect(result.originalRepair.fitsBudget).toBe(false);
    expect(result.originalRepair.budgetDifference).toBe(-13800);
  });

  it('dynamically recommends replacement when repair cost exceeds 50% of device worth', async () => {
    const recommendation = await ReplacementService.getRecommendation(
      'smartphone',
      30000,
      ['liquid_damage'],
      28800 // Repair is nearly 30k, close to full replacement
    );

    expect(recommendation.recommendedId).toBe('rep_phone_01');
    expect(recommendation.recommendationReason).toContain('Repairing current damage accounts for');
    expect(recommendation.comparisonFactors.hasLiquidOrBoardDamage).toBe(true);
  });

  it('dynamically recommends flagship upgrade when budget is generous', async () => {
    const recommendation = await ReplacementService.getRecommendation(
      'smartphone',
      75000, // Budget is 75000, covers brand new sealed unit
      ['screen_crack'],
      10000
    );

    expect(recommendation.recommendedId).toBe('rep_phone_03');
    expect(recommendation.recommendationReason).toContain('comfortably covers the sealed');
  });
});
