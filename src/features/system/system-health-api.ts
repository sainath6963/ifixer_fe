import { baseApi } from '@/app/api/base-api';

export interface HealthIndicatorState {
  status: 'up' | 'down';
  message?: string;
  [detail: string]: unknown;
}

export interface ReadinessResponse {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, HealthIndicatorState>;
  error?: Record<string, HealthIndicatorState>;
  details: Record<string, HealthIndicatorState>;
}

export const systemHealthApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSystemReadiness: builder.query<ReadinessResponse, void>({
      query: () => 'admin/health/ready',
      keepUnusedDataFor: 30,
    }),
  }),
});

export const { useGetSystemReadinessQuery } = systemHealthApi;
