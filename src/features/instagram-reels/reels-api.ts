import { baseApi } from '@/app/api/base-api';
export interface InstagramReel {
  id: string;
  url: string;
  title: string;
  sortOrder: number;
  active?: boolean;
  version?: number;
}
export interface ReelsPage {
  items: InstagramReel[];
  page: number;
  total: number;
  totalPages: number;
}
export const reelsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    instagramReels: builder.query<ReelsPage, { page: number; admin?: boolean; limit?: number }>({
      query: ({ page, admin, limit }) => ({
        url: `${admin ? 'admin/' : ''}repair/reels`,
        params: { page, ...(limit ? { limit } : {}) },
      }),
      providesTags: ['InstagramReel'],
    }),
    saveInstagramReel: builder.mutation<
      InstagramReel,
      {
        id?: string;
        body: {
          url: string;
          title: string;
          sortOrder: number;
          active: boolean;
          expectedVersion?: number;
        };
      }
    >({
      query: ({ id, body }) => ({
        url: `admin/repair/reels${id ? '/' + id : ''}`,
        method: id ? 'PATCH' : 'POST',
        body,
      }),
      invalidatesTags: ['InstagramReel'],
    }),
  }),
});
export const { useInstagramReelsQuery, useSaveInstagramReelMutation } = reelsApi;
