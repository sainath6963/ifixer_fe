import { baseApi } from '@/app/api/base-api';

import type {
  AdminProductReview,
  CustomerProductReview,
  CustomerReviewEligibility,
  ProductReviewPage,
  ProductReviewStatus,
} from './product-review.types';

interface ReviewInput {
  productId: string;
  rating: number;
  title: string;
  body: string;
}

export const productReviewApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProductReviews: build.query<
      ProductReviewPage,
      { productId: string; page?: number; limit?: number }
    >({
      query: ({ productId, ...params }) => ({
        url: `catalog/products/${encodeURIComponent(productId)}/reviews`,
        params,
      }),
      providesTags: (_result, _error, { productId }) => [
        { type: 'Review', id: `PRODUCT:${productId}` },
      ],
    }),
    getCustomerReviewEligibility: build.query<CustomerReviewEligibility, string>({
      query: (productId) => `customer/reviews/product/${encodeURIComponent(productId)}`,
      providesTags: (_result, _error, productId) => [
        { type: 'Review', id: `CUSTOMER:${productId}` },
      ],
    }),
    createProductReview: build.mutation<CustomerProductReview, ReviewInput>({
      query: (body) => ({ url: 'customer/reviews', method: 'POST', body }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'Review', id: `CUSTOMER:${productId}` },
      ],
    }),
    updateProductReview: build.mutation<
      CustomerProductReview,
      Omit<ReviewInput, 'productId'> & {
        reviewId: string;
        productId: string;
        expectedVersion: number;
      }
    >({
      query: ({ reviewId, expectedVersion, rating, title, body }) => ({
        url: `customer/reviews/${encodeURIComponent(reviewId)}`,
        method: 'PATCH',
        body: { expectedVersion, rating, title, body },
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'Review', id: `CUSTOMER:${productId}` },
        { type: 'Review', id: `PRODUCT:${productId}` },
      ],
    }),
    withdrawProductReview: build.mutation<
      CustomerProductReview,
      { reviewId: string; productId: string; expectedVersion: number }
    >({
      query: ({ reviewId, expectedVersion }) => ({
        url: `customer/reviews/${encodeURIComponent(reviewId)}/withdraw`,
        method: 'POST',
        body: { expectedVersion },
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'Review', id: `CUSTOMER:${productId}` },
        { type: 'Review', id: `PRODUCT:${productId}` },
      ],
    }),
    getAdminProductReviews: build.query<
      {
        items: AdminProductReview[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      },
      {
        page?: number;
        limit?: number;
        status?: ProductReviewStatus;
        rating?: number;
        search?: string;
      } | void
    >({
      query: (query) => ({ url: 'admin/reviews', params: { ...(query || {}) } }),
      providesTags: (result) => [
        { type: 'Review', id: 'ADMIN_LIST' },
        ...(result?.items.map(({ id }) => ({ type: 'Review' as const, id })) ?? []),
      ],
    }),
    moderateProductReview: build.mutation<
      AdminProductReview,
      {
        reviewId: string;
        productId: string;
        expectedVersion: number;
        status: 'PUBLISHED' | 'REJECTED';
        rejectionReason?: string;
      }
    >({
      query: ({ reviewId, expectedVersion, status, rejectionReason }) => ({
        url: `admin/reviews/${encodeURIComponent(reviewId)}/moderation`,
        method: 'PATCH',
        body: { expectedVersion, status, rejectionReason },
      }),
      invalidatesTags: (_result, _error, { reviewId, productId }) => [
        { type: 'Review', id: reviewId },
        { type: 'Review', id: 'ADMIN_LIST' },
        { type: 'Review', id: `PRODUCT:${productId}` },
        { type: 'Review', id: `CUSTOMER:${productId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateProductReviewMutation,
  useGetAdminProductReviewsQuery,
  useGetCustomerReviewEligibilityQuery,
  useGetProductReviewsQuery,
  useModerateProductReviewMutation,
  useUpdateProductReviewMutation,
  useWithdrawProductReviewMutation,
} = productReviewApi;
