import { db } from '../db/index.js';

export interface EstimateCalculationResult {
  deviceType: string;
  brand: string;
  faults: string[];
  originalRepair: {
    partsTotal: number;
    labourTotal: number;
    subtotal: number;
    estimatedTurnaroundDays: number;
    fitsBudget: boolean;
    budgetDifference: number; // positive = under budget, negative = over budget
  };
  cheaperAlternative: {
    name: string;
    totalCost: number;
    savingsAmount: number;
    tradeoffExplanation: string;
    fitsBudget: boolean;
  };
  breakdown: Array<{
    faultType: string;
    faultLabel: string;
    originalPartCost: number;
    labourCost: number;
    turnaroundDays: number;
    cheaperAltName: string;
    cheaperAltCost: number;
    cheaperAltTradeoff: string;
  }>;
  disclaimer: string;
}

export interface BillItem {
  description: string;
  category: 'part' | 'labour' | 'diagnostic' | 'replacement';
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface BillCalculationResult {
  items: BillItem[];
  subtotal: number;
  cgstRate: number; // 9%
  cgstAmount: number;
  sgstRate: number; // 9%
  sgstAmount: number;
  totalGstRate: number; // 18%
  totalGstAmount: number;
  grandTotal: number;
}

export class PricingService {
  // Constant standard GST rate in India for electronics repair & telecom services
  static readonly GST_RATE = 0.18;
  static readonly DIAGNOSTIC_FEE = 499; // Waived if repair approved

  static calculateGst(subtotal: number): {
    cgstAmount: number;
    sgstAmount: number;
    totalGstAmount: number;
    grandTotal: number;
  } {
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const totalGst = Math.round(roundedSubtotal * this.GST_RATE * 100) / 100;
    const cgst = Math.round((totalGst / 2) * 100) / 100;
    const sgst = Math.round((totalGst - cgst) * 100) / 100;
    const grandTotal = Math.round((roundedSubtotal + totalGst) * 100) / 100;

    return {
      cgstAmount: cgst,
      sgstAmount: sgst,
      totalGstAmount: totalGst,
      grandTotal
    };
  }

  static async calculateEstimate(
    deviceType: string,
    brand: string,
    faults: string[],
    budget: number
  ): Promise<EstimateCalculationResult> {
    const estimateItems = await db.getEstimatesForFaults(deviceType, brand, faults);

    let partsTotal = 0;
    let labourTotal = 0;
    let maxTurnaroundDays = 1;
    let altPartsTotal = 0;

    const breakdown = estimateItems.map(item => {
      partsTotal += item.original_part_cost;
      labourTotal += item.labour_cost;
      if (item.turnaround_days > maxTurnaroundDays) {
        maxTurnaroundDays = item.turnaround_days;
      }
      altPartsTotal += item.cheaper_alt_cost;

      return {
        faultType: item.fault_type,
        faultLabel: item.fault_label,
        originalPartCost: item.original_part_cost,
        labourCost: item.labour_cost,
        turnaroundDays: item.turnaround_days,
        cheaperAltName: item.cheaper_alt_name,
        cheaperAltCost: item.cheaper_alt_cost,
        cheaperAltTradeoff: item.cheaper_alt_tradeoff
      };
    });

    const originalSubtotal = partsTotal + labourTotal;
    const budgetDifference = budget - originalSubtotal;
    const fitsBudget = budgetDifference >= 0;

    const altSubtotal = altPartsTotal + labourTotal;
    const altSavings = originalSubtotal - altSubtotal;
    const altFitsBudget = (budget - altSubtotal) >= 0;

    // Consolidated plain-language trade-off explanation
    const altNames = estimateItems.map(i => i.cheaper_alt_name).join(', ');
    const tradeoffNotes = estimateItems.map(i => i.cheaper_alt_tradeoff).join(' ');

    return {
      deviceType,
      brand,
      faults,
      originalRepair: {
        partsTotal,
        labourTotal,
        subtotal: originalSubtotal,
        estimatedTurnaroundDays: maxTurnaroundDays,
        fitsBudget,
        budgetDifference
      },
      cheaperAlternative: {
        name: altNames,
        totalCost: altSubtotal,
        savingsAmount: altSavings,
        tradeoffExplanation: tradeoffNotes,
        fitsBudget: altFitsBudget
      },
      breakdown,
      disclaimer: 'All figures shown are provisional estimates subject to physical bench inspection by certified service engineers.'
    };
  }

  static generateBillDetails(
    optionType: 'repair_original' | 'repair_cheaper' | 'replacement',
    estimateData?: EstimateCalculationResult,
    replacementPrice?: number,
    replacementName?: string
  ): BillCalculationResult {
    const items: BillItem[] = [];

    if (optionType === 'replacement' && replacementPrice && replacementName) {
      items.push({
        description: `${replacementName} (Hardware Device)`,
        category: 'replacement',
        unitPrice: replacementPrice,
        quantity: 1,
        total: replacementPrice
      });
      items.push({
        description: 'Certified Diagnostic & Setup Fee (Waived with device purchase)',
        category: 'diagnostic',
        unitPrice: 0,
        quantity: 1,
        total: 0
      });
    } else if (estimateData) {
      if (optionType === 'repair_cheaper') {
        for (const item of estimateData.breakdown) {
          items.push({
            description: `${item.cheaperAltName} for ${item.faultLabel}`,
            category: 'part',
            unitPrice: item.cheaperAltCost,
            quantity: 1,
            total: item.cheaperAltCost
          });
        }
      } else {
        for (const item of estimateData.breakdown) {
          items.push({
            description: `Original OEM Component for ${item.faultLabel}`,
            category: 'part',
            unitPrice: item.originalPartCost,
            quantity: 1,
            total: item.originalPartCost
          });
        }
      }

      // Labour fee
      items.push({
        description: 'Certified Precision Bench Labour & Assembly',
        category: 'labour',
        unitPrice: estimateData.originalRepair.labourTotal,
        quantity: 1,
        total: estimateData.originalRepair.labourTotal
      });

      // Bench diagnostic fee waived
      items.push({
        description: 'Initial Inspection & Multi-Point Bench Diagnostic (Waived on repair approval)',
        category: 'diagnostic',
        unitPrice: 0,
        quantity: 1,
        total: 0
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const gstCalc = this.calculateGst(subtotal);

    return {
      items,
      subtotal,
      cgstRate: 0.09,
      cgstAmount: gstCalc.cgstAmount,
      sgstRate: 0.09,
      sgstAmount: gstCalc.sgstAmount,
      totalGstRate: 0.18,
      totalGstAmount: gstCalc.totalGstAmount,
      grandTotal: gstCalc.grandTotal
    };
  }
}
