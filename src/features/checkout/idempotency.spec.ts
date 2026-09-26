import { createIdempotencyKey, createPaymentIdempotencyKey } from './idempotency';

describe('idempotency keys', () => {
  it('creates backend-compatible unique keys for checkout and payment retries', () => {
    const checkoutKey = createIdempotencyKey('checkout');
    const paymentKey = createIdempotencyKey('payment');

    expect(checkoutKey).toMatch(/^checkout:[A-Za-z0-9-]{36}$/);
    expect(paymentKey).toMatch(/^payment:[A-Za-z0-9-]{36}$/);
    expect(checkoutKey).not.toBe(paymentKey);
  });

  it('keeps payment retries stable for one order and distinct across orders', () => {
    expect(createPaymentIdempotencyKey('RC-20260808-A1B2C3D4E5')).toBe(
      'payment:RC-20260808-A1B2C3D4E5',
    );
    expect(createPaymentIdempotencyKey('RC-20260808-A1B2C3D4E5')).not.toBe(
      createPaymentIdempotencyKey('RC-20260808-F6E7D8C9B0'),
    );
  });
});
