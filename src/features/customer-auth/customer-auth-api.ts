import { baseApi } from '@/app/api/base-api';
import { csrfTokenManager } from '@/app/api/csrf-token-manager';
import { clearCustomer, setCustomer } from '@/features/session/session-slice';

import type {
  ChangeCustomerPasswordInput,
  ConfirmCustomerMobileChangeInput,
  CustomerActionTokenInput,
  CustomerAuthMessageResponse,
  CustomerLoginInput,
  CustomerRegisterInput,
  CustomerResponse,
  CustomerMobileChallengeResponse,
  DeactivateCustomerAccountInput,
  ForgotCustomerPasswordInput,
  ResetCustomerPasswordInput,
  RequestCustomerEmailChangeInput,
  RequestCustomerMobileChangeInput,
  UpdateCustomerPreferencesInput,
  UpdateCustomerProfileInput,
} from './customer-auth.types';

export const customerAuthApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCustomer: build.query<CustomerResponse, void>({
      query: () => ({ url: 'customer/auth/me', method: 'GET' }),
      providesTags: ['Customer'],
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCustomer(data.customer));
        } catch {
          // The bootstrap flow decides whether a refresh attempt is appropriate.
        }
      },
    }),
    loginCustomer: build.mutation<CustomerResponse, CustomerLoginInput>({
      query: (body) => ({ url: 'customer/auth/login', method: 'POST', body }),
      invalidatesTags: ['Cart', 'AddressBook', 'Review', 'Wishlist', 'StockAlert'],
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCustomer(data.customer));
        } catch {
          // Form consumers present the API error.
        }
      },
    }),
    registerCustomer: build.mutation<CustomerResponse, CustomerRegisterInput>({
      query: (body) => ({ url: 'customer/auth/register', method: 'POST', body }),
      invalidatesTags: ['Cart', 'AddressBook', 'Review', 'Wishlist', 'StockAlert'],
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCustomer(data.customer));
        } catch {
          // Form consumers present the API error.
        }
      },
    }),
    refreshCustomer: build.mutation<CustomerResponse, void>({
      query: () => ({ url: 'customer/auth/refresh', method: 'POST' }),
      invalidatesTags: ['Cart', 'AddressBook', 'Review', 'Wishlist', 'StockAlert'],
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCustomer(data.customer));
        } catch {
          dispatch(clearCustomer());
        }
      },
    }),
    logoutCustomer: build.mutation<void, void>({
      query: () => ({ url: 'customer/auth/logout', method: 'POST' }),
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          csrfTokenManager.clear('customer');
          dispatch(clearCustomer());
          dispatch(
            baseApi.util.invalidateTags([
              'Customer',
              'Cart',
              'AddressBook',
              'Review',
              'Wishlist',
              'StockAlert',
            ]),
          );
        } catch {
          // Keep the current session when the server could not confirm logout.
        }
      },
    }),
    logoutAllCustomerSessions: build.mutation<void, void>({
      query: () => ({ url: 'customer/auth/logout-all', method: 'POST' }),
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          csrfTokenManager.clear('customer');
          dispatch(clearCustomer());
          dispatch(
            baseApi.util.invalidateTags([
              'Customer',
              'Cart',
              'AddressBook',
              'Review',
              'Wishlist',
              'StockAlert',
            ]),
          );
        } catch {
          // Keep the current session when the server could not confirm logout.
        }
      },
    }),
    changeCustomerPassword: build.mutation<void, ChangeCustomerPasswordInput>({
      query: (body) => ({ url: 'customer/auth/password', method: 'PATCH', body }),
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          csrfTokenManager.clear('customer');
          dispatch(clearCustomer());
          dispatch(
            baseApi.util.invalidateTags([
              'Customer',
              'Cart',
              'AddressBook',
              'Review',
              'Wishlist',
              'StockAlert',
            ]),
          );
        } catch {
          // Form consumers present the API error.
        }
      },
    }),
    requestVerificationEmail: build.mutation<CustomerAuthMessageResponse, void>({
      query: () => ({ url: 'customer/auth/verification-email', method: 'POST' }),
    }),
    verifyCustomerEmail: build.mutation<void, CustomerActionTokenInput>({
      query: (body) => ({ url: 'customer/auth/verify-email', method: 'POST', body }),
      invalidatesTags: ['Customer'],
    }),
    confirmCustomerEmailChange: build.mutation<void, CustomerActionTokenInput>({
      query: (body) => ({ url: 'customer/auth/change-email', method: 'POST', body }),
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          csrfTokenManager.clear('customer');
          dispatch(clearCustomer());
          dispatch(baseApi.util.invalidateTags(['Customer']));
        } catch {
          // The confirmation page presents invalid or expired token errors.
        }
      },
    }),
    forgotCustomerPassword: build.mutation<
      CustomerAuthMessageResponse,
      ForgotCustomerPasswordInput
    >({
      query: (body) => ({ url: 'customer/auth/forgot-password', method: 'POST', body }),
    }),
    resetCustomerPassword: build.mutation<void, ResetCustomerPasswordInput>({
      query: (body) => ({ url: 'customer/auth/reset-password', method: 'POST', body }),
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          csrfTokenManager.clear('customer');
          dispatch(clearCustomer());
          dispatch(
            baseApi.util.invalidateTags([
              'Customer',
              'Cart',
              'AddressBook',
              'Review',
              'Wishlist',
              'StockAlert',
            ]),
          );
        } catch {
          // The recovery form presents invalid or expired token errors.
        }
      },
    }),
    updateCustomerProfile: build.mutation<CustomerResponse, UpdateCustomerProfileInput>({
      query: (body) => ({ url: 'customer/profile', method: 'PATCH', body }),
      invalidatesTags: ['Customer'],
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCustomer(data.customer));
        } catch {
          // The profile form presents the API error.
        }
      },
    }),
    updateCustomerPreferences: build.mutation<CustomerResponse, UpdateCustomerPreferencesInput>({
      query: (body) => ({ url: 'customer/profile/preferences', method: 'PATCH', body }),
      invalidatesTags: ['Customer', 'StockAlert'],
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCustomer(data.customer));
        } catch {
          // The preferences form presents the API error.
        }
      },
    }),
    requestCustomerEmailChange: build.mutation<
      CustomerAuthMessageResponse,
      RequestCustomerEmailChangeInput
    >({
      query: (body) => ({ url: 'customer/profile/email-change', method: 'POST', body }),
    }),
    requestCustomerMobileChange: build.mutation<
      CustomerMobileChallengeResponse,
      RequestCustomerMobileChangeInput
    >({
      query: (body) => ({ url: 'customer/profile/mobile-change', method: 'POST', body }),
    }),
    confirmCustomerMobileChange: build.mutation<CustomerResponse, ConfirmCustomerMobileChangeInput>(
      {
        query: (body) => ({
          url: 'customer/profile/mobile-change/confirm',
          method: 'POST',
          body,
        }),
        invalidatesTags: ['Customer'],
        async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            dispatch(setCustomer(data.customer));
          } catch {
            // The mobile verification form presents the API error.
          }
        },
      },
    ),
    deactivateCustomerAccount: build.mutation<void, DeactivateCustomerAccountInput>({
      query: (body) => ({ url: 'customer/profile/deactivate', method: 'POST', body }),
      async onQueryStarted(_argument, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          csrfTokenManager.clear('customer');
          dispatch(clearCustomer());
          dispatch(baseApi.util.resetApiState());
        } catch {
          // The deactivation form presents the API error.
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useChangeCustomerPasswordMutation,
  useConfirmCustomerEmailChangeMutation,
  useConfirmCustomerMobileChangeMutation,
  useDeactivateCustomerAccountMutation,
  useGetCustomerQuery,
  useLazyGetCustomerQuery,
  useLoginCustomerMutation,
  useLogoutAllCustomerSessionsMutation,
  useLogoutCustomerMutation,
  useRefreshCustomerMutation,
  useRegisterCustomerMutation,
  useRequestVerificationEmailMutation,
  useRequestCustomerEmailChangeMutation,
  useRequestCustomerMobileChangeMutation,
  useVerifyCustomerEmailMutation,
  useForgotCustomerPasswordMutation,
  useResetCustomerPasswordMutation,
  useUpdateCustomerPreferencesMutation,
  useUpdateCustomerProfileMutation,
} = customerAuthApi;
