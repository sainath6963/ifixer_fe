export function slugifyAdminValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function rupeesToPaise(value: string): number | undefined {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return undefined;
  const [rupees, fraction = ''] = normalized.split('.');
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(paise) ? paise : undefined;
}

export function paiseToRupees(value?: number): string {
  if (value === undefined) return '';
  return (value / 100).toFixed(2);
}

export function adminIdempotencyKey(scope: 'inventory' | 'refund'): string {
  return `${scope}:${crypto.randomUUID()}`;
}

export function attributesFromText(value: string): Array<{ name: string; value: string }> {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf(':');
      if (separator < 1) return { name: '', value: '' };
      return {
        name: slugifyAdminValue(part.slice(0, separator)),
        value: part.slice(separator + 1).trim(),
      };
    })
    .filter(({ name, value }) => Boolean(name && value));
}

export function attributesToText(attributes: Array<{ name: string; value: string }>): string {
  return attributes.map(({ name, value }) => `${name}: ${value}`).join(', ');
}
