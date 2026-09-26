export function createIdempotencyKey(scope: 'checkout' | 'payment'): string {
  return `${scope}:${crypto.randomUUID()}`;
}

export function createPaymentIdempotencyKey(orderNumber: string): string {
  return `payment:${orderNumber}`;
}
