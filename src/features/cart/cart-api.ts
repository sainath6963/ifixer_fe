import { baseApi } from '@/app/api/base-api';

import type { CartResponse, RemoveCartItemInput, SetCartItemInput } from './cart.types';

export const cartApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCart: build.query<CartResponse, void>({
      query: () => ({ url: 'cart', method: 'GET' }),
      providesTags: ['Cart'],
    }),
    setCartItem: build.mutation<CartResponse, SetCartItemInput>({
      query: ({ variantId, ...body }) => ({
        url: `cart/items/${encodeURIComponent(variantId)}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),
    removeCartItem: build.mutation<CartResponse, RemoveCartItemInput>({
      query: ({ variantId, expectedVersion }) => ({
        url: `cart/items/${encodeURIComponent(variantId)}`,
        method: 'DELETE',
        body: { expectedVersion },
      }),
      invalidatesTags: ['Cart'],
    }),
    clearCart: build.mutation<CartResponse, { expectedVersion?: number }>({
      query: (body) => ({ url: 'cart', method: 'DELETE', body }),
      invalidatesTags: ['Cart'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useClearCartMutation,
  useGetCartQuery,
  useRemoveCartItemMutation,
  useSetCartItemMutation,
} = cartApi;
