import { baseApi } from '@/app/api/base-api';

import type {
  CreateCustomerAddressInput,
  CustomerAddressBook,
  CustomerAddressMutationInput,
  ReplaceCustomerAddressInput,
} from './customer-address.types';

export const customerAddressApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCustomerAddressBook: build.query<CustomerAddressBook, void>({
      query: () => 'customer/addresses',
      providesTags: ['AddressBook'],
    }),
    createCustomerAddress: build.mutation<CustomerAddressBook, CreateCustomerAddressInput>({
      query: (body) => ({ url: 'customer/addresses', method: 'POST', body }),
      invalidatesTags: ['AddressBook'],
    }),
    replaceCustomerAddress: build.mutation<CustomerAddressBook, ReplaceCustomerAddressInput>({
      query: ({ id, ...body }) => ({
        url: `customer/addresses/${encodeURIComponent(id)}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['AddressBook'],
    }),
    makeCustomerAddressDefault: build.mutation<CustomerAddressBook, CustomerAddressMutationInput>({
      query: ({ id, expectedVersion }) => ({
        url: `customer/addresses/${encodeURIComponent(id)}/default`,
        method: 'POST',
        body: { expectedVersion },
      }),
      invalidatesTags: ['AddressBook'],
    }),
    deleteCustomerAddress: build.mutation<CustomerAddressBook, CustomerAddressMutationInput>({
      query: ({ id, expectedVersion }) => ({
        url: `customer/addresses/${encodeURIComponent(id)}`,
        method: 'DELETE',
        body: { expectedVersion },
      }),
      invalidatesTags: ['AddressBook'],
    }),
  }),
});

export const {
  useCreateCustomerAddressMutation,
  useDeleteCustomerAddressMutation,
  useGetCustomerAddressBookQuery,
  useMakeCustomerAddressDefaultMutation,
  useReplaceCustomerAddressMutation,
} = customerAddressApi;
