import type { InvoiceLine, Tax } from './billing.types';
export function previewInvoice(lines: InvoiceLine[], discount: number, taxes: Tax[]) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceInPaise, 0);
  const valid =
    lines.length > 0 &&
    lines.every(
      (line) =>
        Number.isSafeInteger(line.quantity) &&
        line.quantity >= 1 &&
        line.quantity <= 100 &&
        Number.isSafeInteger(line.unitPriceInPaise) &&
        line.unitPriceInPaise >= 0,
    ) &&
    Number.isSafeInteger(subtotal) &&
    subtotal <= 1000000000 &&
    Number.isSafeInteger(discount) &&
    discount >= 0 &&
    discount <= subtotal;
  const taxable = valid ? subtotal - discount : 0;
  const amounts = taxes.map((tax) => ({
    ...tax,
    amountInPaise: Math.floor((taxable * tax.rateBps + 5000) / 10000),
  }));
  const total = taxable + amounts.reduce((sum, tax) => sum + tax.amountInPaise, 0);
  return {
    valid: valid && total <= 1000000000,
    subtotal,
    discount,
    taxable,
    taxes: amounts,
    total,
  };
}
