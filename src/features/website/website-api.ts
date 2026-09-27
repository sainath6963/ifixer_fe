import { baseApi } from '@/app/api/base-api';
import type {
  AnalyticsMetric,
  AnalyticsQuery,
} from '@/features/admin-analytics/admin-analytics.types';

export interface WebsiteEventInput {
  visitorId: string;
  sessionId: string;
  path: string;
  referrer: string;
  viewportWidth: number;
}

export interface WebsiteInsightsOverview {
  period: {
    dateFrom: string;
    dateTo: string;
    timezone: 'Asia/Kolkata';
    days: number;
    granularity: 'DAY' | 'WEEK' | 'MONTH';
  };
  kpis: {
    pageViews: AnalyticsMetric;
    visits: AnalyticsMetric;
    uniqueVisitors: AnalyticsMetric;
    googleReviewClicks: AnalyticsMetric;
  };
  trend: Array<{
    key: string;
    pageViews: number;
    visits: number;
    uniqueVisitors: number;
  }>;
  topPages: Array<{ path: string; pageViews: number; visits: number }>;
  sources: Array<{ source: string; visits: number }>;
  devices: Array<{ device: string; pageViews: number; visits: number }>;
  generatedAt: string;
}

export interface GoogleReviewSetting {
  googleReviewUrl: string;
  configured: boolean;
  version: number;
}

export const websiteApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    recordWebsitePageView: build.mutation<{ recorded: boolean }, WebsiteEventInput>({
      query: (body) => ({ url: 'website/page-view', method: 'POST', body }),
    }),
    recordGoogleReviewClick: build.mutation<{ recorded: boolean }, WebsiteEventInput>({
      query: (body) => ({ url: 'website/google-review-click', method: 'POST', body }),
    }),
    getPublicGoogleReviewLink: build.query<{ googleReviewUrl: string | null }, void>({
      query: () => 'website/review-link',
      providesTags: [{ type: 'Website', id: 'REVIEW_LINK' }],
    }),
    getWebsiteInsights: build.query<WebsiteInsightsOverview, AnalyticsQuery | void>({
      query: (params) => ({ url: 'admin/website/insights', params: { ...(params || {}) } }),
      providesTags: [{ type: 'Website', id: 'INSIGHTS' }],
    }),
    getGoogleReviewSetting: build.query<GoogleReviewSetting, void>({
      query: () => 'admin/website/review-settings',
      providesTags: [{ type: 'Website', id: 'REVIEW_SETTING' }],
    }),
    saveGoogleReviewSetting: build.mutation<
      GoogleReviewSetting,
      { googleReviewUrl: string; expectedVersion: number }
    >({
      query: (body) => ({ url: 'admin/website/review-settings', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Website', id: 'REVIEW_SETTING' },
        { type: 'Website', id: 'REVIEW_LINK' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGoogleReviewSettingQuery,
  useGetPublicGoogleReviewLinkQuery,
  useGetWebsiteInsightsQuery,
  useRecordGoogleReviewClickMutation,
  useRecordWebsitePageViewMutation,
  useSaveGoogleReviewSettingMutation,
} = websiteApi;
