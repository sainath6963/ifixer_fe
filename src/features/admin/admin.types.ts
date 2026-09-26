import type {
  FinancialStatus,
  FulfillmentStatus,
  OrderLifecycleStatus,
  ShipmentDetails,
} from '@/features/checkout/checkout.types';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type MediaStatus = 'PENDING' | 'READY' | 'DELETED';
export type RefundStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
export type CouponStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface AdminPage<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminCoupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: CouponStatus;
  discountType: CouponDiscountType;
  percentageOff?: number;
  fixedAmountInPaise?: number;
  maximumDiscountInPaise?: number;
  minimumSubtotalInPaise: number;
  usageLimit: number;
  reservedCount: number;
  redeemedCount: number;
  remainingUses: number;
  startsAt: string;
  endsAt: string;
  availability: 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'ENDED' | 'EXHAUSTED' | 'ARCHIVED';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminInventory {
  variantId: string;
  sku: string;
  onHand: number;
  reserved: number;
  available: number;
  sold: number;
  reorderPoint: number;
  version: number;
}

export interface ProductAttributeInput {
  name: string;
  value: string;
}

export interface ProductVariantInput {
  sku: string;
  title: string;
  attributes: ProductAttributeInput[];
  priceInPaise: number;
  compareAtPriceInPaise?: number;
  isActive?: boolean;
  sortOrder?: number;
  initialOnHand?: number;
  reorderPoint?: number;
}

export interface AdminProductVariant {
  variantId: string;
  sku: string;
  title: string;
  attributes: Array<{ name: string; value: string }>;
  priceInPaise: number;
  compareAtPriceInPaise?: number;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryIds: string[];
  variants: AdminProductVariant[];
  images: Array<{
    mediaAssetId: string;
    altText?: string;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  tags: string[];
  status: ProductStatus;
  isFeatured: boolean;
  publishedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  inventory?: AdminInventory[];
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  imageMediaId?: string;
  status: ProductStatus;
  sortOrder: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMediaVariant {
  name: string;
  width: number;
  height: number;
  sizeBytes: number;
  url: string;
}

export interface AdminMediaAsset {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  width?: number;
  height?: number;
  status: MediaStatus;
  originalUrl: string;
  variants: AdminMediaVariant[];
  createdAt: string;
}

export interface AdminRefund {
  id: string;
  refundNumber: string;
  provider: 'RAZORPAY';
  status: RefundStatus;
  amountInPaise: number;
  currency: 'INR';
  providerRefundId?: string;
  acquirerReference?: string;
  reason: string;
  requestedBy: string;
  failureCode?: string;
  failureDescription?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  customer: { name?: string; email?: string; mobile?: string };
  grandTotalInPaise: number;
  currency: 'INR';
  lifecycleStatus: OrderLifecycleStatus;
  financialStatus: FinancialStatus;
  fulfillmentStatus: FulfillmentStatus;
  shipping?: ShipmentDetails & {
    trackingEvents: Array<ShipmentDetails['trackingEvents'][number] & { actorType: string }>;
  };
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderDetail extends AdminOrderListItem {
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
  };
  items: Array<{
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
  }>;
  totals: {
    subtotalInPaise: number;
    itemDiscountInPaise: number;
    couponDiscountInPaise: number;
    shippingInPaise: number;
    taxInPaise: number;
    grandTotalInPaise: number;
  };
  coupon?: {
    code: string;
    name: string;
    discountType: CouponDiscountType;
    configuredValue: number;
    discountInPaise: number;
  };
  statusHistory: Array<{
    dimension: string;
    from?: string;
    to: string;
    reason?: string;
    actorType: string;
    actorId?: string;
    occurredAt: string;
  }>;
  adminNote?: string;
  payment?: {
    id: string;
    provider: 'RAZORPAY';
    status: string;
    amountInPaise: number;
    currency: 'INR';
    providerOrderId?: string;
    providerPaymentId?: string;
    signatureVerified: boolean;
    refundedInPaise: number;
    refundPendingInPaise: number;
    capturedAt?: string;
    failureCode?: string;
    failureDescription?: string;
  };
  refunds: AdminRefund[];
}

export interface RefundRequestResult {
  refund: AdminRefund & { orderId: string; paymentAttemptId: string };
  financialStatus: FinancialStatus;
  refundedInPaise: number;
  refundPendingInPaise: number;
}

export interface OrderOperationsSummary {
  generatedAt: string;
  orders: {
    pendingPayment: number;
    paidUnfulfilled: number;
    processing: number;
    shipped: number;
    delivered: number;
  };
  refunds: { pending: number; failed: number };
  alerts: { lateCapturedNeedsRefund: number; deliveryExceptions: number };
}

export type NotificationStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'DEAD';
export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';
export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'PUBLISHED' | 'FAILED' | 'DEAD';

export interface AdminNotification {
  id: string;
  sourceEventId: string;
  channel: NotificationChannel;
  templateKey: string;
  recipient: string;
  status: NotificationStatus;
  attempts: number;
  nextAttemptAt: string;
  providerMessageId?: string;
  sentAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOutboxEvent {
  id: string;
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  status: OutboxStatus;
  processingAttempts: number;
  availableAt: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationOperationsSummary {
  outbox: Record<OutboxStatus, number>;
  notifications: Record<NotificationStatus, number>;
}
