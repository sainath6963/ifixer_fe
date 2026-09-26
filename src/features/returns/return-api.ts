import { baseApi } from '@/app/api/base-api';

import type {
  AdminReturnPage,
  AdminReturnRequest,
  CreateReturnRequestInput,
  CustomerReturns,
  ReturnRequest,
  ReturnEvidence,
  ReturnRequestStatus,
  ReturnRequestType,
  ReturnResolutionType,
} from './return.types';

export const returnApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCustomerReturns: build.query<CustomerReturns, string>({
      query: (orderNumber) => `customer/orders/${encodeURIComponent(orderNumber)}/returns`,
      providesTags: (_result, _error, orderNumber) => [
        { type: 'ReturnRequest', id: `CUSTOMER-${orderNumber}` },
      ],
    }),
    createCustomerReturn: build.mutation<
      ReturnRequest,
      { orderNumber: string; idempotencyKey: string; body: CreateReturnRequestInput }
    >({
      query: ({ orderNumber, idempotencyKey, body }) => ({
        url: `customer/orders/${encodeURIComponent(orderNumber)}/returns`,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body,
      }),
      invalidatesTags: (_result, _error, { orderNumber }) => [
        { type: 'ReturnRequest', id: `CUSTOMER-${orderNumber}` },
        { type: 'ReturnRequest', id: 'ADMIN_LIST' },
      ],
    }),
    cancelCustomerReturn: build.mutation<
      ReturnRequest,
      { orderNumber: string; returnNumber: string; expectedVersion: number }
    >({
      query: ({ orderNumber, returnNumber, expectedVersion }) => ({
        url: `customer/orders/${encodeURIComponent(orderNumber)}/returns/${encodeURIComponent(returnNumber)}/cancel`,
        method: 'POST',
        body: { expectedVersion },
      }),
      invalidatesTags: (_result, _error, { orderNumber, returnNumber }) => [
        { type: 'ReturnRequest', id: `CUSTOMER-${orderNumber}` },
        { type: 'ReturnRequest', id: returnNumber },
        { type: 'ReturnRequest', id: 'ADMIN_LIST' },
      ],
    }),
    getCustomerReturnEvidence: build.query<
      ReturnEvidence[],
      { orderNumber: string; returnNumber: string }
    >({
      query: ({ orderNumber, returnNumber }) =>
        `customer/orders/${encodeURIComponent(orderNumber)}/returns/${encodeURIComponent(returnNumber)}/evidence`,
      transformResponse: (response: { evidence: ReturnEvidence[] }) => response.evidence,
      providesTags: (_result, _error, { returnNumber }) => [
        { type: 'ReturnEvidence', id: returnNumber },
      ],
    }),
    uploadCustomerReturnEvidence: build.mutation<
      ReturnEvidence,
      { orderNumber: string; returnNumber: string; file: File }
    >({
      query: ({ orderNumber, returnNumber, file }) => {
        const body = new FormData();
        body.set('file', file);
        return {
          url: `customer/orders/${encodeURIComponent(orderNumber)}/returns/${encodeURIComponent(returnNumber)}/evidence`,
          method: 'POST',
          body,
        };
      },
      transformResponse: (response: { evidence: ReturnEvidence }) => response.evidence,
      invalidatesTags: (_result, _error, { orderNumber, returnNumber }) => [
        { type: 'ReturnEvidence', id: returnNumber },
        { type: 'ReturnRequest', id: `CUSTOMER-${orderNumber}` },
      ],
    }),
    deleteCustomerReturnEvidence: build.mutation<
      void,
      { orderNumber: string; returnNumber: string; evidenceId: string }
    >({
      query: ({ orderNumber, returnNumber, evidenceId }) => ({
        url: `customer/orders/${encodeURIComponent(orderNumber)}/returns/${encodeURIComponent(returnNumber)}/evidence/${encodeURIComponent(evidenceId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { orderNumber, returnNumber }) => [
        { type: 'ReturnEvidence', id: returnNumber },
        { type: 'ReturnRequest', id: `CUSTOMER-${orderNumber}` },
      ],
    }),
    getAdminReturns: build.query<
      AdminReturnPage,
      {
        page?: number;
        limit?: number;
        status?: ReturnRequestStatus;
        type?: ReturnRequestType;
        search?: string;
      } | void
    >({
      query: (query) => ({ url: 'admin/returns', params: { ...(query || {}) } }),
      providesTags: (result) => [
        { type: 'ReturnRequest', id: 'ADMIN_LIST' },
        ...(result?.items.map(({ returnNumber }) => ({
          type: 'ReturnRequest' as const,
          id: returnNumber,
        })) ?? []),
      ],
    }),
    getAdminReturn: build.query<AdminReturnRequest, string>({
      query: (returnNumber) => `admin/returns/${encodeURIComponent(returnNumber)}`,
      providesTags: (_result, _error, returnNumber) => [
        { type: 'ReturnRequest', id: returnNumber },
      ],
    }),
    getAdminReturnEvidence: build.query<ReturnEvidence[], string>({
      query: (returnNumber) => `admin/returns/${encodeURIComponent(returnNumber)}/evidence`,
      transformResponse: (response: { evidence: ReturnEvidence[] }) => response.evidence,
      providesTags: (_result, _error, returnNumber) => [
        { type: 'ReturnEvidence', id: returnNumber },
      ],
    }),
    decideAdminReturn: build.mutation<
      AdminReturnRequest,
      {
        returnNumber: string;
        expectedVersion: number;
        status: 'APPROVED' | 'REJECTED';
        customerMessage?: string;
        internalNote?: string;
      }
    >({
      query: ({ returnNumber, ...body }) => ({
        url: `admin/returns/${encodeURIComponent(returnNumber)}/decision`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { returnNumber }) => [
        { type: 'ReturnRequest', id: returnNumber },
        { type: 'ReturnRequest', id: 'ADMIN_LIST' },
      ],
    }),
    receiveAdminReturn: build.mutation<
      AdminReturnRequest,
      {
        returnNumber: string;
        expectedVersion: number;
        items: Array<{ variantId: string; restockQuantity: number }>;
        customerMessage?: string;
        internalNote?: string;
      }
    >({
      query: ({ returnNumber, ...body }) => ({
        url: `admin/returns/${encodeURIComponent(returnNumber)}/receive`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { returnNumber }) => [
        { type: 'ReturnRequest', id: returnNumber },
        { type: 'ReturnRequest', id: 'ADMIN_LIST' },
        { type: 'Inventory', id: 'LIST' },
      ],
    }),
    completeAdminReturn: build.mutation<
      AdminReturnRequest,
      {
        returnNumber: string;
        expectedVersion: number;
        resolutionType: ReturnResolutionType;
        refundId?: string;
        courierName?: string;
        trackingNumber?: string;
        trackingUrl?: string;
        customerMessage?: string;
        internalNote?: string;
      }
    >({
      query: ({ returnNumber, ...body }) => ({
        url: `admin/returns/${encodeURIComponent(returnNumber)}/complete`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { returnNumber }) => [
        { type: 'ReturnRequest', id: returnNumber },
        { type: 'ReturnRequest', id: 'ADMIN_LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCancelCustomerReturnMutation,
  useCompleteAdminReturnMutation,
  useCreateCustomerReturnMutation,
  useDeleteCustomerReturnEvidenceMutation,
  useDecideAdminReturnMutation,
  useGetAdminReturnEvidenceQuery,
  useGetAdminReturnQuery,
  useGetAdminReturnsQuery,
  useGetCustomerReturnsQuery,
  useReceiveAdminReturnMutation,
  useUploadCustomerReturnEvidenceMutation,
  useGetCustomerReturnEvidenceQuery,
} = returnApi;

export function returnIdempotencyKey(): string {
  return `return:${Date.now()}:${crypto.randomUUID()}`;
}
