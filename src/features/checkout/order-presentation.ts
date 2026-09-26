import type { CustomerOrder } from './checkout.types';

const statusLabels: Record<CustomerOrder['lifecycleStatus'], string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Payment expired',
  COMPLETED: 'Completed',
};

export function orderStatusLabel(order: CustomerOrder): string {
  if (order.financialStatus === 'PAID' && order.fulfillmentStatus === 'SHIPPED') return 'Shipped';
  if (order.financialStatus === 'PAID' && order.fulfillmentStatus === 'DELIVERED')
    return 'Delivered';
  if (order.financialStatus === 'PAID') return 'Paid';
  if (order.financialStatus === 'PENDING') return 'Payment processing';
  return statusLabels[order.lifecycleStatus];
}

export function orderPaymentAvailable(order: CustomerOrder, now = Date.now()): boolean {
  return (
    order.paymentReady &&
    order.lifecycleStatus === 'PENDING_PAYMENT' &&
    ['UNPAID', 'PENDING'].includes(order.financialStatus) &&
    new Date(order.paymentExpiresAt).getTime() > now
  );
}

export function paymentTimeRemaining(expiresAt: string, now = Date.now()): string {
  const remainingSeconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
