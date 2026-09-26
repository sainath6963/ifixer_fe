import type { CustomerOrder } from './checkout.types';
import { orderPaymentAvailable, paymentTimeRemaining } from './order-presentation';

const order = {
  paymentReady: true,
  lifecycleStatus: 'PENDING_PAYMENT',
  financialStatus: 'UNPAID',
  paymentExpiresAt: '2026-08-08T12:15:00.000Z',
} as CustomerOrder;

describe('order payment presentation', () => {
  it('uses both server state and the local deadline before offering payment', () => {
    expect(orderPaymentAvailable(order, Date.parse('2026-08-08T12:00:00.000Z'))).toBe(true);
    expect(orderPaymentAvailable(order, Date.parse('2026-08-08T12:15:00.000Z'))).toBe(false);
  });

  it('formats the reservation countdown without going negative', () => {
    expect(
      paymentTimeRemaining(order.paymentExpiresAt, Date.parse('2026-08-08T12:00:30.000Z')),
    ).toBe('14:30');
    expect(
      paymentTimeRemaining(order.paymentExpiresAt, Date.parse('2026-08-08T12:20:00.000Z')),
    ).toBe('0:00');
  });
});
