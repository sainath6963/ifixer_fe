import { baseApi } from '@/app/api/base-api';
import type {
  FinancialStatus,
  FulfillmentStatus,
  OrderLifecycleStatus,
  ShipmentStatus,
} from '@/features/checkout/checkout.types';

import type {
  AdminCategory,
  AdminCoupon,
  AdminInventory,
  AdminMediaAsset,
  AdminNotification,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOutboxEvent,
  AdminPage,
  AdminProduct,
  ProductVariantInput,
  RefundRequestResult,
  NotificationOperationsSummary,
  NotificationChannel,
  NotificationStatus,
  OrderOperationsSummary,
  OutboxStatus,
  ProductStatus,
  CouponDiscountType,
  CouponStatus,
} from './admin.types';

export interface AdminProductQuery {
  page?: number;
  limit?: number;
  status?: ProductStatus;
  categoryId?: string;
  search?: string;
}

export interface AdminOrderQuery {
  page?: number;
  limit?: number;
  search?: string;
  lifecycleStatus?: OrderLifecycleStatus;
  financialStatus?: FinancialStatus;
  fulfillmentStatus?: FulfillmentStatus;
  createdFrom?: string;
  createdTo?: string;
}

export interface CreateAdminProductInput {
  name: string;
  slug: string;
  description: string;
  categoryIds?: string[];
  variants: ProductVariantInput[];
  tags?: string[];
  isFeatured?: boolean;
}

export interface UpdateAdminProductInput {
  productId: string;
  expectedVersion: number;
  name?: string;
  slug?: string;
  description?: string;
  categoryIds?: string[];
  tags?: string[];
  status?: ProductStatus;
  isFeatured?: boolean;
}

export interface UpdateAdminVariantInput {
  productId: string;
  variantId: string;
  expectedProductVersion: number;
  sku?: string;
  title?: string;
  attributes?: ProductVariantInput['attributes'];
  priceInPaise?: number;
  compareAtPriceInPaise?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface AdminProductImageInput {
  mediaAssetId: string;
  altText?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface CreateAdminCategoryInput {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  imageMediaId?: string | null;
  sortOrder?: number;
}

export interface UpdateAdminCategoryInput {
  categoryId: string;
  expectedVersion: number;
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  imageMediaId?: string | null;
  sortOrder?: number;
  status?: ProductStatus;
}

export interface CreateAdminCouponInput {
  code: string;
  name: string;
  description?: string;
  discountType: CouponDiscountType;
  percentageOff?: number;
  fixedAmountInPaise?: number;
  maximumDiscountInPaise?: number;
  minimumSubtotalInPaise: number;
  usageLimit: number;
  startsAt: string;
  endsAt: string;
}

export const adminOperationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminCoupons: build.query<
      AdminPage<AdminCoupon>,
      { page?: number; limit?: number; status?: CouponStatus; search?: string } | void
    >({
      query: (query) => ({ url: 'admin/coupons', params: { ...(query || {}) } }),
      providesTags: (result) => [
        { type: 'Coupon', id: 'ADMIN_LIST' },
        ...(result?.items.map(({ id }) => ({ type: 'Coupon' as const, id })) ?? []),
      ],
    }),
    createAdminCoupon: build.mutation<{ coupon: AdminCoupon }, CreateAdminCouponInput>({
      query: (body) => ({ url: 'admin/coupons', method: 'POST', body }),
      invalidatesTags: [{ type: 'Coupon', id: 'ADMIN_LIST' }],
    }),
    updateAdminCoupon: build.mutation<
      { coupon: AdminCoupon },
      {
        couponId: string;
        expectedVersion: number;
        code?: string;
        name?: string;
        description?: string | null;
        status?: CouponStatus;
        discountType?: CouponDiscountType;
        percentageOff?: number | null;
        fixedAmountInPaise?: number | null;
        maximumDiscountInPaise?: number | null;
        minimumSubtotalInPaise?: number;
        usageLimit?: number;
        startsAt?: string;
        endsAt?: string;
      }
    >({
      query: ({ couponId, ...body }) => ({
        url: `admin/coupons/${encodeURIComponent(couponId)}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { couponId }) => [
        { type: 'Coupon', id: couponId },
        { type: 'Coupon', id: 'ADMIN_LIST' },
      ],
    }),
    getAdminProducts: build.query<AdminPage<AdminProduct>, AdminProductQuery | void>({
      query: (query) => ({ url: 'admin/products', params: { ...(query || {}) } }),
      providesTags: (result) => [
        { type: 'Product', id: 'ADMIN_LIST' },
        ...(result?.items.map(({ id }) => ({ type: 'Product' as const, id })) ?? []),
      ],
    }),
    getAdminProduct: build.query<{ product: AdminProduct }, string>({
      query: (productId) => `admin/products/${encodeURIComponent(productId)}`,
      providesTags: (_result, _error, productId) => [{ type: 'Product', id: productId }],
    }),
    createAdminProduct: build.mutation<{ product: AdminProduct }, CreateAdminProductInput>({
      query: (body) => ({ url: 'admin/products', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Product', id: 'ADMIN_LIST' },
        { type: 'Product', id: 'LIST' },
      ],
    }),
    updateAdminProduct: build.mutation<{ product: AdminProduct }, UpdateAdminProductInput>({
      query: ({ productId, ...body }) => ({
        url: `admin/products/${encodeURIComponent(productId)}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: 'ADMIN_LIST' },
        { type: 'Product', id: 'LIST' },
        { type: 'Product', id: 'FEATURED' },
      ],
    }),
    addAdminProductVariant: build.mutation<
      { product: AdminProduct },
      ProductVariantInput & { productId: string; expectedProductVersion: number }
    >({
      query: ({ productId, ...body }) => ({
        url: `admin/products/${encodeURIComponent(productId)}/variants`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: 'ADMIN_LIST' },
        { type: 'Inventory', id: productId },
        { type: 'StockAlert', id: 'ADMIN_DEMAND' },
      ],
    }),
    updateAdminProductVariant: build.mutation<{ product: AdminProduct }, UpdateAdminVariantInput>({
      query: ({ productId, variantId, ...body }) => ({
        url: `admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: 'ADMIN_LIST' },
      ],
    }),
    replaceAdminProductImages: build.mutation<
      { product: AdminProduct },
      { productId: string; expectedProductVersion: number; images: AdminProductImageInput[] }
    >({
      query: ({ productId, ...body }) => ({
        url: `admin/products/${encodeURIComponent(productId)}/images`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: 'ADMIN_LIST' },
        { type: 'Product', id: 'LIST' },
        { type: 'Product', id: 'FEATURED' },
      ],
    }),
    adjustAdminInventory: build.mutation<
      { inventory: AdminInventory },
      {
        productId: string;
        variantId: string;
        deltaOnHand: number;
        idempotencyKey: string;
        note: string;
      }
    >({
      query: ({ productId, variantId, ...body }) => ({
        url: `admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}/inventory-adjustments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: 'ADMIN_LIST' },
        { type: 'Inventory', id: productId },
        { type: 'StockAlert', id: 'ADMIN_DEMAND' },
      ],
    }),
    getAdminCategories: build.query<
      AdminPage<AdminCategory>,
      { page?: number; limit?: number; status?: ProductStatus; parentId?: string } | void
    >({
      query: (query) => ({ url: 'admin/categories', params: { ...(query || {}) } }),
      providesTags: (result) => [
        { type: 'Category', id: 'ADMIN_LIST' },
        ...(result?.items.map(({ id }) => ({ type: 'Category' as const, id })) ?? []),
      ],
    }),
    getAdminCategory: build.query<{ category: AdminCategory }, string>({
      query: (categoryId) => `admin/categories/${encodeURIComponent(categoryId)}`,
      providesTags: (_result, _error, categoryId) => [{ type: 'Category', id: categoryId }],
    }),
    createAdminCategory: build.mutation<{ category: AdminCategory }, CreateAdminCategoryInput>({
      query: (body) => ({ url: 'admin/categories', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Category', id: 'ADMIN_LIST' },
        { type: 'Category', id: 'LIST' },
      ],
    }),
    updateAdminCategory: build.mutation<{ category: AdminCategory }, UpdateAdminCategoryInput>({
      query: ({ categoryId, ...body }) => ({
        url: `admin/categories/${encodeURIComponent(categoryId)}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { categoryId }) => [
        { type: 'Category', id: categoryId },
        { type: 'Category', id: 'ADMIN_LIST' },
        { type: 'Category', id: 'LIST' },
      ],
    }),
    getAdminMedia: build.query<
      AdminPage<AdminMediaAsset>,
      { page?: number; limit?: number; status?: AdminMediaAsset['status'] } | void
    >({
      query: (query) => ({ url: 'admin/media', params: { ...(query || {}) } }),
      providesTags: (result) => [
        { type: 'Media', id: 'LIST' },
        ...(result?.items.map(({ id }) => ({ type: 'Media' as const, id })) ?? []),
      ],
    }),
    uploadAdminImage: build.mutation<{ media: AdminMediaAsset }, File>({
      query: (file) => {
        const body = new FormData();
        body.append('file', file);
        return { url: 'admin/media/images', method: 'POST', body };
      },
      invalidatesTags: [{ type: 'Media', id: 'LIST' }],
    }),
    deleteAdminMedia: build.mutation<void, string>({
      query: (assetId) => ({
        url: `admin/media/${encodeURIComponent(assetId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, assetId) => [
        { type: 'Media', id: assetId },
        { type: 'Media', id: 'LIST' },
      ],
    }),
    getOrderOperationsSummary: build.query<OrderOperationsSummary, void>({
      query: () => 'admin/orders/operations-summary',
      providesTags: [{ type: 'Order', id: 'ADMIN_SUMMARY' }],
    }),
    getAdminOrders: build.query<AdminPage<AdminOrderListItem>, AdminOrderQuery | void>({
      query: (query) => ({ url: 'admin/orders', params: { ...(query || {}) } }),
      providesTags: (result) => [
        { type: 'Order', id: 'ADMIN_LIST' },
        ...(result?.items.map(({ orderNumber }) => ({ type: 'Order' as const, id: orderNumber })) ??
          []),
      ],
    }),
    getAdminOrder: build.query<{ order: AdminOrderDetail }, string>({
      query: (orderNumber) => `admin/orders/${encodeURIComponent(orderNumber)}`,
      providesTags: (_result, _error, orderNumber) => [{ type: 'Order', id: orderNumber }],
    }),
    updateOrderFulfillment: build.mutation<
      { order: AdminOrderDetail },
      {
        orderNumber: string;
        expectedVersion: number;
        status: FulfillmentStatus;
        courierName?: string;
        trackingNumber?: string;
        trackingUrl?: string;
        reason?: string;
      }
    >({
      query: ({ orderNumber, ...body }) => ({
        url: `admin/orders/${encodeURIComponent(orderNumber)}/fulfillment`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { orderNumber }) => [
        { type: 'Order', id: orderNumber },
        { type: 'Order', id: 'ADMIN_LIST' },
        { type: 'Order', id: 'ADMIN_SUMMARY' },
      ],
    }),
    createOrderShipment: build.mutation<
      { order: AdminOrderDetail },
      {
        orderNumber: string;
        expectedVersion: number;
        courierName: string;
        trackingNumber: string;
        trackingUrl?: string;
        serviceLevel?: string;
        estimatedDeliveryAt?: string;
      }
    >({
      query: ({ orderNumber, ...body }) => ({
        url: `admin/orders/${encodeURIComponent(orderNumber)}/shipment`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { orderNumber }) => [
        { type: 'Order', id: orderNumber },
        { type: 'Order', id: 'ADMIN_LIST' },
        { type: 'Order', id: 'ADMIN_SUMMARY' },
      ],
    }),
    updateOrderShipmentStatus: build.mutation<
      { order: AdminOrderDetail },
      {
        orderNumber: string;
        expectedVersion: number;
        status: ShipmentStatus;
        message: string;
        location?: string;
      }
    >({
      query: ({ orderNumber, ...body }) => ({
        url: `admin/orders/${encodeURIComponent(orderNumber)}/shipment/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { orderNumber }) => [
        { type: 'Order', id: orderNumber },
        { type: 'Order', id: 'ADMIN_LIST' },
        { type: 'Order', id: 'ADMIN_SUMMARY' },
      ],
    }),
    updateOrderAdminNote: build.mutation<
      { order: AdminOrderDetail },
      { orderNumber: string; expectedVersion: number; adminNote: string }
    >({
      query: ({ orderNumber, ...body }) => ({
        url: `admin/orders/${encodeURIComponent(orderNumber)}/admin-note`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { orderNumber }) => [{ type: 'Order', id: orderNumber }],
    }),
    requestAdminRefund: build.mutation<
      RefundRequestResult,
      {
        orderNumber: string;
        expectedOrderVersion: number;
        amountInPaise: number;
        reason: string;
        idempotencyKey: string;
      }
    >({
      query: ({ orderNumber, idempotencyKey, ...body }) => ({
        url: `admin/orders/${encodeURIComponent(orderNumber)}/refunds`,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: { ...body, confirmRefund: true },
      }),
      invalidatesTags: (_result, _error, { orderNumber }) => [
        { type: 'Order', id: orderNumber },
        { type: 'Order', id: 'ADMIN_LIST' },
        { type: 'Order', id: 'ADMIN_SUMMARY' },
      ],
    }),
    getNotificationOperationsSummary: build.query<NotificationOperationsSummary, void>({
      query: () => 'admin/notifications/operations-summary',
      providesTags: [{ type: 'Notification', id: 'SUMMARY' }],
    }),
    getAdminNotifications: build.query<
      AdminPage<AdminNotification>,
      {
        page?: number;
        limit?: number;
        status?: NotificationStatus;
        channel?: NotificationChannel;
        templateKey?: string;
        search?: string;
      } | void
    >({
      query: (query) => ({ url: 'admin/notifications', params: { ...(query || {}) } }),
      providesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    getAdminOutbox: build.query<
      AdminPage<AdminOutboxEvent>,
      { page?: number; limit?: number; status?: OutboxStatus; search?: string } | void
    >({
      query: (query) => ({ url: 'admin/notifications/outbox', params: { ...(query || {}) } }),
      providesTags: [{ type: 'Notification', id: 'OUTBOX' }],
    }),
    retryAdminNotification: build.mutation<{ notification: AdminNotification }, string>({
      query: (notificationId) => ({
        url: `admin/notifications/${encodeURIComponent(notificationId)}/retry`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'SUMMARY' },
      ],
    }),
    retryAdminOutbox: build.mutation<{ eventId: string; status: OutboxStatus }, string>({
      query: (outboxEventId) => ({
        url: `admin/notifications/outbox/${encodeURIComponent(outboxEventId)}/retry`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'OUTBOX' },
        { type: 'Notification', id: 'SUMMARY' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useAddAdminProductVariantMutation,
  useAdjustAdminInventoryMutation,
  useCreateAdminCategoryMutation,
  useCreateAdminCouponMutation,
  useCreateAdminProductMutation,
  useCreateOrderShipmentMutation,
  useDeleteAdminMediaMutation,
  useGetAdminCategoriesQuery,
  useGetAdminCouponsQuery,
  useGetAdminCategoryQuery,
  useGetAdminMediaQuery,
  useGetAdminOrderQuery,
  useGetAdminOrdersQuery,
  useGetAdminOutboxQuery,
  useGetAdminProductQuery,
  useGetAdminProductsQuery,
  useGetNotificationOperationsSummaryQuery,
  useGetOrderOperationsSummaryQuery,
  useGetAdminNotificationsQuery,
  useReplaceAdminProductImagesMutation,
  useRequestAdminRefundMutation,
  useRetryAdminNotificationMutation,
  useRetryAdminOutboxMutation,
  useUpdateAdminCategoryMutation,
  useUpdateAdminCouponMutation,
  useUpdateAdminProductMutation,
  useUpdateAdminProductVariantMutation,
  useUpdateOrderAdminNoteMutation,
  useUpdateOrderFulfillmentMutation,
  useUpdateOrderShipmentStatusMutation,
  useUploadAdminImageMutation,
} = adminOperationsApi;
