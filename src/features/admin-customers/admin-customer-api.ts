import { baseApi } from '@/app/api/base-api';

import type { AccountStatus, AdminCustomerDetail, AdminCustomerPage } from './admin-customer.types';

export const adminCustomerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminCustomers: build.query<
      AdminCustomerPage,
      { page?: number; limit?: number; search?: string; status?: AccountStatus }
    >({
      query: (params) => ({ url: 'admin/customers', params }),
      providesTags: [{ type: 'AdminCustomer', id: 'LIST' }],
    }),
    getAdminCustomer: build.query<{ customer: AdminCustomerDetail }, string>({
      query: (customerId) => `admin/customers/${encodeURIComponent(customerId)}`,
      providesTags: (_result, _error, customerId) => [{ type: 'AdminCustomer', id: customerId }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAdminCustomerQuery, useGetAdminCustomersQuery } = adminCustomerApi;
