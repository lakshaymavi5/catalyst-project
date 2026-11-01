export interface ValidationRule {
  modelPattern: RegExp;
  modelPlaceholder: string;
  modelHint: string;
  serialPattern: RegExp;
  serialPlaceholder: string;
  serialHint: string;
}

export const BRAND_VALIDATION_RULES: Record<string, ValidationRule> = {
  Apple: {
    modelPattern: /^A\d{4}$/i,
    modelPlaceholder: 'e.g. A3106, A2882',
    modelHint: 'Apple model numbers start with "A" followed by 4 digits (found on the back or in Settings > General > About).',
    serialPattern: /^[A-HJ-NP-Z0-9]{10,12}$/i,
    serialPlaceholder: 'e.g. F2LNQ1P0M9',
    serialHint: 'Apple serial numbers are 10 or 12 characters (alphanumeric, excluding letters I, O, and Q).'
  },
  Samsung: {
    modelPattern: /^SM-[A-Z0-9]{4,6}$/i,
    modelPlaceholder: 'e.g. SM-S911B, SM-X710',
    modelHint: 'Samsung model numbers start with "SM-" followed by 4 to 6 alphanumeric characters.',
    serialPattern: /^[A-Z0-9]{11,15}$/i,
    serialPlaceholder: 'e.g. R58M90A81YZ',
    serialHint: 'Samsung serial numbers or IMEIs are 11 to 15 alphanumeric characters.'
  },
  Google: {
    modelPattern: /^G[A-Z0-9]{4}$/i,
    modelPlaceholder: 'e.g. G1MNW, G025J',
    modelHint: 'Google Pixel model numbers start with "G" followed by 4 characters (printed on SIM tray or device box).',
    serialPattern: /^[A-Z0-9]{12,16}$/i,
    serialPlaceholder: 'e.g. 1A234B56789012',
    serialHint: 'Google serial numbers are 12 to 16 alphanumeric characters.'
  },
  Dell: {
    modelPattern: /^[A-Z0-9]{4,5}$/i,
    modelPlaceholder: 'e.g. 9320, 5420',
    modelHint: 'Dell chassis series numbers are 4 to 5 digits (e.g. 9320 for XPS 13 Plus).',
    serialPattern: /^[A-Z0-9]{7}$/i,
    serialPlaceholder: 'e.g. 7XYZ991',
    serialHint: 'Dell Service Tags are exactly 7 alphanumeric characters.'
  },
  Lenovo: {
    modelPattern: /^[A-Z0-9]{4}$/i,
    modelPlaceholder: 'e.g. 21AH, 20W0',
    modelHint: 'Lenovo Machine Type numbers are 4 characters (found on bottom casing label).',
    serialPattern: /^[A-Z0-9]{8}$/i,
    serialPlaceholder: 'e.g. PF3A9XYZ',
    serialHint: 'Lenovo serial numbers are 8 characters.'
  }
};

export function validateModelNumber(brand: string, model: string): { valid: boolean; error?: string } {
  const trimmed = model.trim();
  if (!trimmed) {
    return { valid: false, error: 'Model number is required.' };
  }

  const rule = BRAND_VALIDATION_RULES[brand];
  if (!rule) {
    if (trimmed.length < 2) {
      return { valid: false, error: 'Model number must be at least 2 characters.' };
    }
    return { valid: true };
  }

  if (!rule.modelPattern.test(trimmed)) {
    return {
      valid: false,
      error: `Invalid format for ${brand}. ${rule.modelHint}`
    };
  }

  return { valid: true };
}

export function validateSerialNumber(brand: string, serial: string): { valid: boolean; error?: string } {
  const trimmed = serial.trim();
  if (!trimmed) {
    return { valid: false, error: 'Serial number is required.' };
  }

  const rule = BRAND_VALIDATION_RULES[brand];
  if (!rule) {
    if (trimmed.length < 4) {
      return { valid: false, error: 'Serial number must be at least 4 characters.' };
    }
    return { valid: true };
  }

  if (!rule.serialPattern.test(trimmed)) {
    return {
      valid: false,
      error: `Invalid format for ${brand}. ${rule.serialHint}`
    };
  }

  return { valid: true };
}
