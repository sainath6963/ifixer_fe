import { baseApi } from '@/app/api/base-api';

import type {
  ProductStockAlertState,
  StockAlert,
  StockDemandPage,
  WishlistMembership,
  WishlistPage,
} from './wishlist.types';

interface ProductVariantKey {
  productId: string;
  variantId: string;
}

export const wishlistApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWishlist: build.query<WishlistPage, { page?: number; limit?: number } | void>({
      query: (query) => ({ url: 'customer/wishlist', params: { ...(query || {}) } }),
      providesTags: (result) => [
        { type: 'Wishlist', id: 'LIST' },
        ...(result?.items.map(({ product }) => ({
          type: 'Wishlist' as const,
          id: `PRODUCT:${product.id}`,
        })) ?? []),
      ],
    }),
    getWishlistMembership: build.query<WishlistMembership, string>({
      query: (productId) => `customer/wishlist/products/${encodeURIComponent(productId)}`,
      providesTags: (_result, _error, productId) => [
        { type: 'Wishlist', id: `PRODUCT:${productId}` },
      ],
    }),
    addWishlistItem: build.mutation<WishlistMembership, string>({
      query: (productId) => ({
        url: `customer/wishlist/${encodeURIComponent(productId)}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, productId) => [
        { type: 'Wishlist', id: 'LIST' },
        { type: 'Wishlist', id: `PRODUCT:${productId}` },
      ],
    }),
    removeWishlistItem: build.mutation<WishlistMembership, string>({
      query: (productId) => ({
        url: `customer/wishlist/${encodeURIComponent(productId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, productId) => [
        { type: 'Wishlist', id: 'LIST' },
        { type: 'Wishlist', id: `PRODUCT:${productId}` },
      ],
    }),
    getStockAlerts: build.query<{ alerts: StockAlert[] }, void>({
      query: () => 'customer/stock-alerts',
      providesTags: (result) => [
        { type: 'StockAlert', id: 'CUSTOMER_LIST' },
        ...(result?.alerts.map(({ variantId }) => ({
          type: 'StockAlert' as const,
          id: `VARIANT:${variantId}`,
        })) ?? []),
      ],
    }),
    getProductStockAlertState: build.query<ProductStockAlertState, string>({
      query: (productId) => `customer/stock-alerts/product/${encodeURIComponent(productId)}`,
      providesTags: (_result, _error, productId) => [
        { type: 'StockAlert', id: `PRODUCT:${productId}` },
      ],
    }),
    subscribeStockAlert: build.mutation<StockAlert, ProductVariantKey>({
      query: ({ productId, variantId }) => ({
        url: `customer/stock-alerts/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { productId, variantId }) => [
        { type: 'StockAlert', id: 'CUSTOMER_LIST' },
        { type: 'StockAlert', id: `PRODUCT:${productId}` },
        { type: 'StockAlert', id: `VARIANT:${variantId}` },
        { type: 'StockAlert', id: 'ADMIN_DEMAND' },
      ],
    }),
    cancelStockAlert: build.mutation<{ active: false }, ProductVariantKey>({
      query: ({ productId, variantId }) => ({
        url: `customer/stock-alerts/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { productId, variantId }) => [
        { type: 'StockAlert', id: 'CUSTOMER_LIST' },
        { type: 'StockAlert', id: `PRODUCT:${productId}` },
        { type: 'StockAlert', id: `VARIANT:${variantId}` },
        { type: 'StockAlert', id: 'ADMIN_DEMAND' },
      ],
    }),
    getAdminStockDemand: build.query<
      StockDemandPage,
      { page?: number; limit?: number; search?: string } | void
    >({
      query: (query) => ({ url: 'admin/stock-demand', params: { ...(query || {}) } }),
      providesTags: [{ type: 'StockAlert', id: 'ADMIN_DEMAND' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useAddWishlistItemMutation,
  useCancelStockAlertMutation,
  useGetAdminStockDemandQuery,
  useGetProductStockAlertStateQuery,
  useGetStockAlertsQuery,
  useGetWishlistMembershipQuery,
  useGetWishlistQuery,
  useRemoveWishlistItemMutation,
  useSubscribeStockAlertMutation,
} = wishlistApi;
