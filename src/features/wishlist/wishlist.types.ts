import type { ProductCardView } from '@/features/catalog/catalog.types';

export interface WishlistItem {
  id: string;
  addedAt: string;
  product: ProductCardView;
}

export interface WishlistPage {
  items: WishlistItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WishlistMembership {
  wishlisted: boolean;
}

export interface StockAlert {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantTitle: string;
  sku: string;
  status: 'ACTIVE' | 'NOTIFIED' | 'CANCELLED';
  requestedAt: string;
  notifiedAt?: string;
  cancelledAt?: string;
  version: number;
}

export interface ProductStockAlertState {
  emailEligible: boolean;
  emailEligibilityReason?: string;
  activeVariantIds: string[];
}

export interface StockDemand {
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantTitle: string;
  sku: string;
  subscriberCount: number;
  available: number;
  lastRequestedAt: string;
}

export interface StockDemandPage {
  items: StockDemand[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
