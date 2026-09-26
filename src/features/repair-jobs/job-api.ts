import { baseApi } from '@/app/api/base-api';
import type { JobIntake, RepairJob, TeamMember } from './job.types';
export const jobApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    repairJobs: builder.query<
      { items: RepairJob[]; total: number; page: number; totalPages: number },
      { page: number; search?: string; status?: string; custody?: string }
    >({
      query: (params) => ({ url: 'admin/repair/jobs', params }),
      providesTags: ['RepairJob'],
      keepUnusedDataFor: 0,
    }),
    repairJob: builder.query<RepairJob, string>({
      query: (number) => `admin/repair/jobs/${number}`,
      providesTags: ['RepairJob'],
      keepUnusedDataFor: 0,
    }),
    createRepairJob: builder.mutation<RepairJob, JobIntake>({
      query: (body) => ({ url: 'admin/repair/jobs', method: 'POST', body }),
      invalidatesTags: ['RepairJob', 'RepairBooking'],
    }),
    updateRepairJob: builder.mutation<
      RepairJob,
      {
        number: string;
        action: string;
        body: Record<string, unknown> | FormData;
        method?: 'POST' | 'PATCH' | 'DELETE';
      }
    >({
      query: ({ number, action, body, method = 'POST' }) => ({
        url: `admin/repair/jobs/${number}/${action}`,
        method,
        body,
      }),
      invalidatesTags: ['RepairJob', 'RepairInventory', 'RepairBilling'],
    }),
    repairTeam: builder.query<TeamMember[], void>({
      query: () => 'admin/repair/team',
      providesTags: ['RepairTeam'],
      keepUnusedDataFor: 0,
    }),
    saveRepairMember: builder.mutation<void, { id?: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `admin/repair/team${id ? '/' + id : ''}`,
        method: id ? 'PATCH' : 'POST',
        body,
      }),
      invalidatesTags: ['RepairTeam'],
    }),
  }),
});
export const {
  useRepairJobsQuery,
  useRepairJobQuery,
  useCreateRepairJobMutation,
  useUpdateRepairJobMutation,
  useRepairTeamQuery,
  useSaveRepairMemberMutation,
} = jobApi;
