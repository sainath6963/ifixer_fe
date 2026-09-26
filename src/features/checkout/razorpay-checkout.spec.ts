import { razorpayCheckoutExpired } from './razorpay-checkout';

describe('Razorpay checkout expiry', () => {
  it('blocks an expired or invalid payment window', () => {
    const now = Date.parse('2026-08-08T12:00:00.000Z');
    expect(razorpayCheckoutExpired('2026-08-08T11:59:59.000Z', now)).toBe(true);
    expect(razorpayCheckoutExpired('not-a-date', now)).toBe(true);
  });

  it('allows a checkout whose reservation is still active', () => {
    const now = Date.parse('2026-08-08T12:00:00.000Z');
    expect(razorpayCheckoutExpired('2026-08-08T12:15:00.000Z', now)).toBe(false);
  });
});
