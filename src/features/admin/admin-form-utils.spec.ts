import { describe, expect, it } from 'vitest';

import {
  attributesFromText,
  attributesToText,
  paiseToRupees,
  rupeesToPaise,
  slugifyAdminValue,
} from './admin-form-utils';

describe('admin form utilities', () => {
  it('normalizes slugs without allowing empty separators', () => {
    expect(slugifyAdminValue('  Summer / Linen 2026  ')).toBe('summer-linen-2026');
  });

  it('converts rupees without floating-point rounding', () => {
    expect(rupeesToPaise('1')).toBe(100);
    expect(rupeesToPaise('1250.05')).toBe(125005);
    expect(rupeesToPaise('12.345')).toBeUndefined();
    expect(paiseToRupees(125005)).toBe('1250.05');
  });

  it('round-trips compact variant attributes', () => {
    const attributes = attributesFromText('color: Walnut, size: XL');
    expect(attributes).toEqual([
      { name: 'color', value: 'Walnut' },
      { name: 'size', value: 'XL' },
    ]);
    expect(attributesToText(attributes)).toBe('color: Walnut, size: XL');
  });
});
