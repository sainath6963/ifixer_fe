import { baseApi } from '@/app/api/base-api';

import type {
  CheckoutInput,
  CheckoutPreview,
  CustomerOrder,
  CustomerOrderPage,
  PaymentVerificationResult,
  RazorpayCheckout,
  RazorpaySuccessResponse,
} from './checkout.types';

export interface CreateOrderInput extends CheckoutInput {
  idempotencyKey: string;
}

export interface InitiatePaymentInput {
  orderNumber: string;
  idempotencyKey: string;
}

export const checkoutApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    previewCheckout: build.mutation<{ preview: CheckoutPreview }, CheckoutInput>({
      query: (body) => ({ url: 'checkout/preview', method: 'POST', body }),
    }),
    createOrder: build.mutation<{ order: CustomerOrder }, CreateOrderInput>({
      query: ({ idempotencyKey, ...body }) => ({
        url: 'checkout/orders',
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body,
      }),
      invalidatesTags: [{ type: 'Order', id: 'LIST' }, 'Cart'],
    }),
    getOrders: build.query<CustomerOrderPage, { page?: number; limit?: number } | void>({
      query: (query) => ({ url: 'customer/orders', params: { ...(query || {}) } }),
      providesTags: (result) => [
        { type: 'Order', id: 'LIST' },
        ...(result?.items.map(({ orderNumber }) => ({
          type: 'Order' as const,
          id: orderNumber,
        })) ?? []),
      ],
    }),
    getOrder: build.query<{ order: CustomerOrder }, string>({
      query: (orderNumber) => `customer/orders/${encodeURIComponent(orderNumber)}`,
      providesTags: (_result, _error, orderNumber) => [{ type: 'Order', id: orderNumber }],
    }),
    cancelOrder: build.mutation<{ order: CustomerOrder }, string>({
      query: (orderNumber) => ({
        url: `customer/orders/${encodeURIComponent(orderNumber)}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, orderNumber) => [
        { type: 'Order', id: orderNumber },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    initiateRazorpayPayment: build.mutation<{ checkout: RazorpayCheckout }, InitiatePaymentInput>({
      query: ({ orderNumber, idempotencyKey }) => ({
        url: `customer/orders/${encodeURIComponent(orderNumber)}/payments/razorpay`,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    }),
    verifyRazorpayPayment: build.mutation<
      PaymentVerificationResult,
      RazorpaySuccessResponse & { orderNumber: string }
    >({
      query: ({ orderNumber, ...body }) => ({
        url: `customer/orders/${encodeURIComponent(orderNumber)}/payments/razorpay/verify`,
        method: 'POST',
        body: {
          razorpayOrderId: body.razorpay_order_id,
          razorpayPaymentId: body.razorpay_payment_id,
          razorpaySignature: body.razorpay_signature,
        },
      }),
      invalidatesTags: (_result, _error, { orderNumber }) => [
        { type: 'Order', id: orderNumber },
        { type: 'Order', id: 'LIST' },
        'Cart',
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCancelOrderMutation,
  useCreateOrderMutation,
  useGetOrderQuery,
  useGetOrdersQuery,
  useInitiateRazorpayPaymentMutation,
  usePreviewCheckoutMutation,
  useVerifyRazorpayPaymentMutation,
} = checkoutApi;
