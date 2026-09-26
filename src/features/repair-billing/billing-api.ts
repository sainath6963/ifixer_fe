import { baseApi } from '@/app/api/base-api';
import type { BillingSettings, JobBilling, Invoice } from './billing.types';
export const billingApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    billingSettings: b.query<BillingSettings, void>({
      query: () => 'admin/repair/billing/settings',
      providesTags: ['RepairBilling'],
      keepUnusedDataFor: 0,
    }),
    jobBilling: b.query<JobBilling, string>({
      query: (number) => `admin/repair/jobs/${number}/billing`,
      providesTags: ['RepairBilling', 'RepairJob'],
      keepUnusedDataFor: 0,
    }),
    repairInvoices: b.query<
      { items: Invoice[]; total: number; page: number; totalPages: number },
      { page: number; search: string }
    >({
      query: (params) => ({ url: 'admin/repair/billing/invoices', params }),
      providesTags: ['RepairBilling'],
      keepUnusedDataFor: 0,
    }),
  }),
});
export const { useBillingSettingsQuery, useJobBillingQuery, useRepairInvoicesQuery } = billingApi;
