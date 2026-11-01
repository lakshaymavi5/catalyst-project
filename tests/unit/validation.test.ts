import { describe, it, expect } from 'vitest';
import {
  validateModelNumber,
  validateSerialNumber
} from '../../src/client/utils/brandValidators.js';

describe('Brand Model & Serial Number Format Validation', () => {
  describe('Apple format validation', () => {
    it('accepts valid Apple model numbers (A followed by 4 digits)', () => {
      expect(validateModelNumber('Apple', 'A3106').valid).toBe(true);
      expect(validateModelNumber('Apple', 'a2882').valid).toBe(true);
    });

    it('rejects invalid Apple model numbers', () => {
      expect(validateModelNumber('Apple', '3106').valid).toBe(false);
      expect(validateModelNumber('Apple', 'iPhone15').valid).toBe(false);
    });

    it('accepts valid 10 or 12 character Apple serial numbers', () => {
      expect(validateSerialNumber('Apple', 'F2LNQ1P0M9').valid).toBe(true);
      expect(validateSerialNumber('Apple', 'C02G1234MD6R').valid).toBe(true);
    });

    it('rejects Apple serial numbers containing invalid characters (I, O, Q)', () => {
      // In Apple serial format, I, O, Q are disallowed to avoid visual confusion with 1, 0
      expect(validateSerialNumber('Apple', 'F2LIQ1P0M9').valid).toBe(false);
    });
  });

  describe('Samsung format validation', () => {
    it('accepts valid Samsung model numbers (SM- prefix)', () => {
      expect(validateModelNumber('Samsung', 'SM-S911B').valid).toBe(true);
      expect(validateModelNumber('Samsung', 'SM-X710').valid).toBe(true);
    });

    it('rejects Samsung models without SM- prefix', () => {
      expect(validateModelNumber('Samsung', 'S911B').valid).toBe(false);
    });

    it('validates Samsung serials / IMEIs (11 to 15 alphanumeric characters)', () => {
      expect(validateSerialNumber('Samsung', 'R58M90A81YZ').valid).toBe(true);
      expect(validateSerialNumber('Samsung', '1234').valid).toBe(false);
    });
  });

  describe('Dell & Lenovo formats', () => {
    it('validates Dell 7-character Service Tags', () => {
      expect(validateSerialNumber('Dell', '7XYZ991').valid).toBe(true);
      expect(validateSerialNumber('Dell', '12345').valid).toBe(false);
    });

    it('validates Lenovo 8-character serial numbers', () => {
      expect(validateSerialNumber('Lenovo', 'PF3A9XYZ').valid).toBe(true);
      expect(validateSerialNumber('Lenovo', 'PF3A9').valid).toBe(false);
    });
  });
});
