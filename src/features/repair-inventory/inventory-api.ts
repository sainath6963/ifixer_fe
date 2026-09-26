import { baseApi } from '@/app/api/base-api';
import type {
  Page,
  Part,
  Supplier,
  Lot,
  Purchase,
  Movement,
  JobParts,
  Operation,
} from './inventory.types';
export type {
  Page,
  Part,
  Supplier,
  Lot,
  Purchase,
  Movement,
  Usage,
  JobParts,
  Operation,
} from './inventory.types';
type Query = Record<string, string | number | undefined>;
const root = 'admin/repair/inventory';
export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    spareParts: b.query<Page<Part>, Query>({
      query: (params) => ({ url: `${root}/parts`, params }),
      providesTags: ['RepairInventory'],
      keepUnusedDataFor: 0,
    }),
    sparePart: b.query<Part, string>({
      query: (id) => `${root}/parts/${id}`,
      providesTags: ['RepairInventory'],
      keepUnusedDataFor: 0,
    }),
    stockLots: b.query<Page<Lot>, { id: string; page: number }>({
      query: ({ id, page }) => ({
        url: `${root}/parts/${id}/lots`,
        params: { page, active: 'true' },
      }),
      providesTags: ['RepairInventory'],
      keepUnusedDataFor: 0,
    }),
    suppliers: b.query<Page<Supplier>, Query>({
      query: (params) => ({ url: `${root}/suppliers`, params }),
      providesTags: ['RepairInventory'],
      keepUnusedDataFor: 0,
    }),
    purchases: b.query<Page<Purchase>, Query>({
      query: (params) => ({ url: `${root}/purchases`, params }),
      providesTags: ['RepairInventory'],
      keepUnusedDataFor: 0,
    }),
    purchase: b.query<Purchase, string>({
      query: (id) => `${root}/purchases/${id}`,
      providesTags: ['RepairInventory'],
      keepUnusedDataFor: 0,
    }),
    movements: b.query<Page<Movement>, Query>({
      query: (params) => ({ url: `${root}/movements`, params }),
      providesTags: ['RepairInventory'],
      keepUnusedDataFor: 0,
    }),
    jobParts: b.query<JobParts, string>({
      query: (number) => `admin/repair/jobs/${number}/parts`,
      providesTags: ['RepairInventory', 'RepairJob'],
      keepUnusedDataFor: 0,
    }),
    stockOperation: b.mutation<unknown, Operation>({
      query: ({ path, ...rest }) => ({ url: `admin/repair/${path}`, ...rest }),
      invalidatesTags: (_result, _error, operation) =>
        operation.path.startsWith('billing/') || operation.path.includes('/billing/')
          ? ['RepairBilling', 'RepairJob']
          : ['RepairInventory', 'RepairJob'],
    }),
  }),
});
export const {
  useSparePartsQuery,
  useSparePartQuery,
  useStockLotsQuery,
  useSuppliersQuery,
  usePurchasesQuery,
  usePurchaseQuery,
  useMovementsQuery,
  useJobPartsQuery,
  useStockOperationMutation,
} = inventoryApi;
