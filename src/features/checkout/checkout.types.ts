import type { CartView } from '@/features/cart/cart.types';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: 'IN';
}

export interface CheckoutInput {
  expectedCartVersion: number;
  shippingAddress: ShippingAddress;
  couponCode?: string;
}

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface AppliedCoupon {
  code: string;
  name: string;
  discountType: CouponDiscountType;
  configuredValue: number;
  discountInPaise: number;
  endsAt?: string;
}

export interface CheckoutPreview {
  cart: CartView;
  shippingAddress: ShippingAddress;
  totals: OrderTotals & { currency: 'INR' };
  coupon?: AppliedCoupon;
  reservationMinutes: number;
  readyToCreateOrder: boolean;
}

export interface OrderTotals {
  subtotalInPaise: number;
  itemDiscountInPaise: number;
  couponDiscountInPaise: number;
  shippingInPaise: number;
  taxInPaise: number;
  grandTotalInPaise: number;
}

export type OrderLifecycleStatus =
  'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';
export type FinancialStatus =
  'UNPAID' | 'PENDING' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FAILED';
export type FulfillmentStatus =
  'UNFULFILLED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
export type ShippingProvider = 'MANUAL';
export type ShipmentStatus =
  'READY_TO_SHIP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERY_EXCEPTION' | 'DELIVERED';

export interface ShipmentDetails {
  provider: ShippingProvider;
  status: ShipmentStatus;
  courierName: string;
  trackingNumber: string;
  trackingUrl?: string;
  serviceLevel?: string;
  estimatedDeliveryAt?: string;
  trackingEvents: Array<{
    status: ShipmentStatus;
    message: string;
    location?: string;
    occurredAt: string;
  }>;
  lastEventAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface CustomerOrderItem {
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  sku: string;
  variantTitle: string;
  attributes: Array<{ name: string; value: string }>;
  unitPriceInPaise: number;
  discountInPaise: number;
  taxInPaise: number;
  quantity: number;
  lineTotalInPaise: number;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customer: { name?: string; email?: string; mobile?: string };
  shippingAddress: ShippingAddress;
  items: CustomerOrderItem[];
  totals: OrderTotals;
  coupon?: AppliedCoupon;
  currency: 'INR';
  lifecycleStatus: OrderLifecycleStatus;
  financialStatus: FinancialStatus;
  fulfillmentStatus: FulfillmentStatus;
  shipping?: ShipmentDetails;
  paymentExpiresAt: string;
  paymentReady: boolean;
  statusHistory: Array<{
    dimension: string;
    from?: string;
    to: string;
    reason?: string;
    occurredAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOrderPage {
  items: CustomerOrder[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RazorpayCheckout {
  paymentAttemptId: string;
  provider: 'RAZORPAY';
  keyId: string;
  providerOrderId: string;
  amountInPaise: number;
  currency: 'INR';
  checkoutName: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
  expiresAt: string;
}

export type PaymentAttemptStatus =
  'CREATING' | 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'CANCELLED';

export interface PaymentAttempt {
  id: string;
  provider: 'RAZORPAY';
  amountInPaise: number;
  currency: 'INR';
  status: PaymentAttemptStatus;
  providerOrderId?: string;
  providerPaymentId?: string;
  signatureVerified: boolean;
  failureCode?: string;
  failureDescription?: string;
  updatedAt: string;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface PaymentVerificationResult {
  payment: PaymentAttempt;
  order: CustomerOrder;
}
