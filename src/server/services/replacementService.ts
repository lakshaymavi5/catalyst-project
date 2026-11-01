import { db, ReplacementOptionItem } from '../db/index.js';

export interface ReplacementRecommendationResult {
  options: Array<ReplacementOptionItem & { isRecommended: boolean }>;
  recommendedId: string;
  recommendationReason: string;
  comparisonFactors: {
    repairCostRatio: number; // repair subtotal / baseline replacement price
    isMultiFault: boolean;
    hasLiquidOrBoardDamage: boolean;
    budgetCoverage: 'under_budget' | 'matches_budget' | 'exceeds_budget';
  };
}

export class ReplacementService {
  static async getRecommendation(
    deviceType: string,
    budget: number,
    faults: string[],
    repairSubtotal: number
  ): Promise<ReplacementRecommendationResult> {
    const rawOptions = await db.getReplacementsForDevice(deviceType);
    if (!rawOptions || rawOptions.length === 0) {
      throw new Error(`No replacement options configured for device category: ${deviceType}`);
    }

    // Take exactly 3 options for clean tabular comparison
    const options = rawOptions.slice(0, 3);
    const baselinePrice = options[0].price;
    const repairCostRatio = Math.round((repairSubtotal / baselinePrice) * 100) / 100;
    const isMultiFault = faults.length > 1;
    const hasLiquidOrBoardDamage = faults.some(f => 
      f.includes('liquid') || f.includes('board') || f.includes('motherboard')
    );

    let recommendedId = options[0].id;
    let recommendationReason = '';

    // Dynamic decision matrix
    if (hasLiquidOrBoardDamage && budget >= options[1].price) {
      recommendedId = options[1].id;
      recommendationReason = `Given liquid/motherboard corrosion on your current unit, component micro-repairs carry recurring failure risks. The ${options[1].name} gives you modern hardware and fresh warranty within your ₹${budget.toLocaleString('en-IN')} budget.`;
    } else if (hasLiquidOrBoardDamage || repairCostRatio >= 0.50) {
      recommendedId = options[0].id;
      recommendationReason = `Repairing current damage accounts for ${Math.round(repairCostRatio * 100)}% of a certified replacement unit. The ${options[0].name} provides a full 12-month warranty for only ₹${(options[0].price - repairSubtotal).toLocaleString('en-IN')} more than repair.`;
    } else if (budget >= options[2].price) {
      recommendedId = options[2].id;
      recommendationReason = `Your budget of ₹${budget.toLocaleString('en-IN')} comfortably covers the sealed ${options[2].name}, delivering maximum multi-year software support and full manufacturer warranty.`;
    } else if (isMultiFault) {
      recommendedId = options[0].id;
      recommendationReason = `Your device has ${faults.length} distinct hardware faults. Replacing individual components compounds assembly risks; the ${options[0].name} gives you a factory-tested fresh unit immediately.`;
    } else {
      // Find option with price closest to budget without exceeding, or default to lowest
      const affordable = options.filter(o => o.price <= budget);
      if (affordable.length > 0) {
        const bestAffordable = affordable[affordable.length - 1];
        recommendedId = bestAffordable.id;
        recommendationReason = `Selected because the ${bestAffordable.name} fits squarely within your ₹${budget.toLocaleString('en-IN')} budget while upgrading device generation.`;
      } else {
        recommendedId = options[0].id;
        recommendationReason = `The ${options[0].name} is the most economical replacement pathway, keeping costs as close as possible to your ₹${budget.toLocaleString('en-IN')} target.`;
      }
    }

    let budgetCoverage: 'under_budget' | 'matches_budget' | 'exceeds_budget' = 'matches_budget';
    const chosenOption = options.find(o => o.id === recommendedId) || options[0];
    if (chosenOption.price < budget) budgetCoverage = 'under_budget';
    else if (chosenOption.price > budget) budgetCoverage = 'exceeds_budget';

    return {
      options: options.map(opt => ({
        ...opt,
        isRecommended: opt.id === recommendedId
      })),
      recommendedId,
      recommendationReason,
      comparisonFactors: {
        repairCostRatio,
        isMultiFault,
        hasLiquidOrBoardDamage,
        budgetCoverage
      }
    };
  }
}
