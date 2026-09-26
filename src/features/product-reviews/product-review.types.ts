export type ProductReviewStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'WITHDRAWN';

export interface PublicProductReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  displayName: string;
  verifiedPurchase: true;
  publishedAt: string;
}

export interface CustomerProductReview {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  orderNumber: string;
  rating: number;
  title: string;
  body: string;
  status: ProductReviewStatus;
  rejectionReason?: string;
  publishedAt?: string;
  withdrawnAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductReview extends CustomerProductReview {
  customerId: string;
  orderId: string;
  displayName: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

export interface ProductReviewPage {
  items: PublicProductReview[];
  summary: { reviewCount: number; averageRating: number };
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomerReviewEligibility {
  eligible: boolean;
  reason?: string;
  deliveredOrderNumber?: string;
  review?: CustomerProductReview;
}
