import { baseApi } from '@/app/api/base-api';
import type {
  BookingChange,
  BookingInput,
  BookingStatus,
  CatalogEntry,
  CatalogKind,
  RepairBooking,
  RepairCatalog,
} from './repair.types';

export const repairApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    repairCatalog: builder.query<RepairCatalog, boolean | void>({
      query: (admin) => (admin ? 'admin/repair/catalog' : 'repair/catalog'),
      providesTags: ['RepairCatalog'],
    }),
    saveRepairCatalog: builder.mutation<
      { entry: CatalogEntry },
      { kind: CatalogKind; id?: string; body: Record<string, unknown> }
    >({
      query: ({ kind, id, body }) => ({
        url: `admin/repair/catalog/${kind}${id ? '/' + id : ''}`,
        method: id ? 'PATCH' : 'POST',
        body,
      }),
      invalidatesTags: ['RepairCatalog'],
    }),
    createRepairBooking: builder.mutation<
      { booking: RepairBooking },
      { input: BookingInput; admin?: boolean }
    >({
      query: ({ input, admin }) => ({
        url: `${admin ? 'admin/' : ''}repair/bookings`,
        method: 'POST',
        body: input,
      }),
      invalidatesTags: ['RepairBooking'],
    }),
    repairBooking: builder.query<
      { booking: RepairBooking },
      { reference: string; token?: string; admin?: boolean }
    >({
      query: ({ reference, token, admin }) => ({
        url: `${admin ? 'admin/' : ''}repair/bookings/${encodeURIComponent(reference)}`,
        headers: token ? { 'X-Repair-Token': token } : {},
      }),
      providesTags: ['RepairBooking'],
      keepUnusedDataFor: 0,
    }),
    repairBookings: builder.query<
      { items: RepairBooking[]; total: number; totalPages: number; page: number; limit: number },
      { page: number; search?: string; status?: BookingStatus }
    >({
      query: (params) => ({ url: 'admin/repair/bookings', params: { ...params, limit: 20 } }),
      providesTags: ['RepairBooking'],
    }),
    changeRepairBooking: builder.mutation<
      { booking: RepairBooking },
      { reference: string; token?: string; admin?: boolean; input: BookingChange }
    >({
      query: ({ reference, token, admin, input }) => ({
        url: `${admin ? 'admin/' : ''}repair/bookings/${encodeURIComponent(reference)}`,
        method: 'PATCH',
        body: input,
        headers: token ? { 'X-Repair-Token': token } : {},
      }),
      invalidatesTags: ['RepairBooking'],
    }),
  }),
});
export const {
  useRepairCatalogQuery,
  useSaveRepairCatalogMutation,
  useCreateRepairBookingMutation,
  useRepairBookingQuery,
  useRepairBookingsQuery,
  useChangeRepairBookingMutation,
} = repairApi;
