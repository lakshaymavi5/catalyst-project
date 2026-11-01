import { describe, it, expect, beforeAll } from 'vitest';
import { PricingService } from '../../src/server/services/pricingService.js';
import { db } from '../../src/server/db/index.js';

describe('Pricing Calculation Logic', () => {
  beforeAll(async () => {
    await db.init();
  });

  it('aggregates parts and labour correctly for smartphone screen repair', async () => {
    const result = await PricingService.calculateEstimate(
      'smartphone',
      'Apple',
      ['screen_crack'],
      25000
    );

    expect(result.originalRepair.partsTotal).toBe(16500);
    expect(result.originalRepair.labourTotal).toBe(1400);
    expect(result.originalRepair.subtotal).toBe(17900);
    expect(result.originalRepair.fitsBudget).toBe(true);
    expect(result.originalRepair.budgetDifference).toBe(7100);
  });

  it('calculates cheaper alternative savings and delta correctly', async () => {
    const result = await PricingService.calculateEstimate(
      'smartphone',
      'Apple',
      ['screen_crack'],
      20000
    );

    expect(result.cheaperAlternative.name).toContain('OEM-Grade');
    expect(result.cheaperAlternative.totalCost).toBe(9800 + 1400); // alt part + labour
    expect(result.cheaperAlternative.savingsAmount).toBe(17900 - (9800 + 1400));
    expect(result.cheaperAlternative.fitsBudget).toBe(true);
  });

  it('combines multiple faults and sets maximum turnaround time', async () => {
    const result = await PricingService.calculateEstimate(
      'smartphone',
      'Apple',
      ['screen_crack', 'liquid_damage'],
      50000
    );

    // Screen (16500 + 1400, 2 days) + Liquid (26000 + 2800, 4 days)
    expect(result.breakdown.length).toBe(2);
    expect(result.originalRepair.partsTotal).toBe(16500 + 26000);
    expect(result.originalRepair.labourTotal).toBe(1400 + 2800);
    expect(result.originalRepair.estimatedTurnaroundDays).toBe(4);
  });
});
