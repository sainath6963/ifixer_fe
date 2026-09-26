import { baseApi } from '@/app/api/base-api';

import type { AdminAnalyticsOverview, AnalyticsQuery } from './admin-analytics.types';

export const adminAnalyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminAnalytics: build.query<AdminAnalyticsOverview, AnalyticsQuery | void>({
      query: (params) => ({ url: 'admin/analytics', params: { ...(params || {}) } }),
      providesTags: [{ type: 'AdminAnalytics', id: 'OVERVIEW' }],
    }),
    exportAdminAnalytics: build.mutation<Blob, AnalyticsQuery | void>({
      query: (params) => ({
        url: 'admin/analytics/export.csv',
        method: 'GET',
        params: { ...(params || {}) },
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useExportAdminAnalyticsMutation, useGetAdminAnalyticsQuery } = adminAnalyticsApi;
