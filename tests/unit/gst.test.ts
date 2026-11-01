import { describe, it, expect } from 'vitest';
import { PricingService } from '../../src/server/services/pricingService.js';

describe('GST (Goods & Services Tax) Calculations', () => {
  it('calculates exactly 18% GST split into 9% CGST and 9% SGST', () => {
    const subtotal = 10000;
    const result = PricingService.calculateGst(subtotal);

    expect(result.totalGstAmount).toBe(1800);
    expect(result.cgstAmount).toBe(900);
    expect(result.sgstAmount).toBe(900);
    expect(result.grandTotal).toBe(11800);
  });

  it('handles fractional currency rounding correctly', () => {
    const subtotal = 14250.50;
    const result = PricingService.calculateGst(subtotal);

    // 14250.50 * 0.18 = 2565.09
    expect(result.totalGstAmount).toBe(2565.09);
    expect(result.cgstAmount + result.sgstAmount).toBeCloseTo(2565.09, 2);
    expect(result.grandTotal).toBe(16815.59);
  });

  it('generates itemised bill structure with diagnostic fee properly listed', () => {
    const bill = PricingService.generateBillDetails(
      'replacement',
      undefined,
      42999,
      'Apple iPhone 14 (128GB)'
    );

    expect(bill.items.length).toBe(2);
    expect(bill.items[0].category).toBe('replacement');
    expect(bill.items[0].unitPrice).toBe(42999);
    expect(bill.items[1].category).toBe('diagnostic');
    expect(bill.items[1].unitPrice).toBe(0); // Waived
    expect(bill.subtotal).toBe(42999);
    expect(bill.totalGstRate).toBe(0.18);
    expect(bill.grandTotal).toBe(Math.round((42999 + 42999 * 0.18) * 100) / 100);
  });
});
