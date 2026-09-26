export type ReturnRequestType = 'RETURN' | 'EXCHANGE';
export type ReturnRequestStatus =
  'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'RECEIVED' | 'COMPLETED' | 'EXPIRED';
export type ExchangeReservationStatus = 'ACTIVE' | 'COMMITTED' | 'EXPIRED';
export type ReturnReason =
  'SIZE_ISSUE' | 'DAMAGED' | 'WRONG_ITEM' | 'QUALITY_ISSUE' | 'CHANGED_MIND' | 'OTHER';
export type ReturnResolutionType = 'REFUND' | 'EXCHANGE';

export interface ReturnEvidence {
  id: string;
  originalFilename: string;
  mimeType: 'image/webp';
  sizeBytes: number;
  width: number;
  height: number;
  contentUrl: string;
  createdAt: string;
}

export interface ReturnExchangeOption {
  variantId: string;
  sku: string;
  title: string;
  attributes: Array<{ name: string; value: string }>;
  currentlyAvailable: boolean;
}

export interface ReturnEligibilityItem {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  variantTitle: string;
  orderedQuantity: number;
  allocatedQuantity: number;
  availableQuantity: number;
  exchangeOptions: ReturnExchangeOption[];
}

export interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderNumber: string;
  type: ReturnRequestType;
  status: ReturnRequestStatus;
  items: Array<{
    productId: string;
    variantId: string;
    productName: string;
    sku: string;
    variantTitle: string;
    quantity: number;
    reason: ReturnReason;
    reasonDetail?: string;
    requestedExchangeVariant?: ReturnExchangeOption;
    estimatedValueInPaise: number;
    restockedQuantity: number;
  }>;
  estimatedTotalInPaise: number;
  customerNote?: string;
  customerMessage?: string;
  requestedAt: string;
  decidedAt?: string;
  receivedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  exchangeReservation?: {
    status: ExchangeReservationStatus;
    expiresAt?: string;
    finalizedAt?: string;
  };
  resolution?: {
    type: ReturnResolutionType;
    refundId?: string;
    courierName?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  };
  statusHistory: Array<{
    status: ReturnRequestStatus;
    actorType?: string;
    actorId?: string;
    message?: string;
    occurredAt: string;
  }>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerReturns {
  eligibility: {
    eligible: boolean;
    reason?: string;
    deliveredAt?: string;
    deadline?: string;
    windowDays: number;
    items: ReturnEligibilityItem[];
  };
  requests: ReturnRequest[];
}

export interface AdminReturnRequest extends ReturnRequest {
  customerId: string;
  internalNote?: string;
  lastAdminId?: string;
}

export interface AdminReturnPage {
  items: AdminReturnRequest[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateReturnRequestInput {
  type: ReturnRequestType;
  items: Array<{
    variantId: string;
    quantity: number;
    reason: ReturnReason;
    reasonDetail?: string;
    requestedExchangeVariantId?: string;
  }>;
  customerNote?: string;
}
