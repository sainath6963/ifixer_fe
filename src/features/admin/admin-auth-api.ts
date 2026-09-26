import { baseApi } from '@/app/api/base-api';
import { csrfTokenManager } from '@/app/api/csrf-token-manager';
import { clearAdmin, setAdmin, type AdminIdentity } from '@/features/session/session-slice';

export interface AdminResponse {
  admin: AdminIdentity;
}

export const adminAuthApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdmin: build.query<AdminResponse, void>({
      query: () => 'admin/auth/me',
      providesTags: ['Admin'],
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setAdmin(data.admin));
        } catch {
          // The route bootstrap owns anonymous-state fallback.
        }
      },
    }),
    loginAdmin: build.mutation<AdminResponse, { email: string; password: string }>({
      query: (body) => ({ url: 'admin/auth/login', method: 'POST', body }),
      invalidatesTags: ['Review', 'StockAlert'],
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setAdmin(data.admin));
        } catch {
          // Form consumers present the error.
        }
      },
    }),
    logoutAdmin: build.mutation<void, void>({
      query: () => ({ url: 'admin/auth/logout', method: 'POST' }),
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          csrfTokenManager.clear('admin');
          dispatch(clearAdmin());
          dispatch(baseApi.util.invalidateTags(['Admin', 'Review', 'StockAlert']));
        } catch {
          // Preserve the local session when logout was not confirmed.
        }
      },
    }),
    logoutAllAdminSessions: build.mutation<void, void>({
      query: () => ({ url: 'admin/auth/logout-all', method: 'POST' }),
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          csrfTokenManager.clear('admin');
          dispatch(clearAdmin());
          dispatch(baseApi.util.invalidateTags(['Admin', 'Review', 'StockAlert']));
        } catch {
          // Preserve the local session when logout was not confirmed.
        }
      },
    }),
    changeAdminPassword: build.mutation<void, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: 'admin/auth/password', method: 'PATCH', body }),
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          csrfTokenManager.clear('admin');
          dispatch(clearAdmin());
          dispatch(baseApi.util.invalidateTags(['Admin', 'Review', 'StockAlert']));
        } catch {
          // Preserve the local session when the password change was rejected.
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useChangeAdminPasswordMutation,
  useGetAdminQuery,
  useLoginAdminMutation,
  useLogoutAdminMutation,
  useLogoutAllAdminSessionsMutation,
} = adminAuthApi;
