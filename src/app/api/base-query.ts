import type {
  BaseQueryApi,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { environment } from '@/config/environment';
import { clearAdmin, clearCustomer } from '@/features/session/session-slice';

import type { ApiProblem, CsrfScope, CsrfTokenResponse } from './api.types';
import { csrfTokenManager } from './csrf-token-manager';

type RichCultureBaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: environment.apiBaseUrl,
  credentials: 'include',
  prepareHeaders: (headers) => {
    headers.set('Accept', 'application/json');
    return headers;
  },
});

const pendingCsrfRequests = new Map<CsrfScope, Promise<string>>();
let pendingCustomerRefresh: Promise<boolean> | undefined;
let pendingAdminRefresh: Promise<boolean> | undefined;
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

class CsrfAcquisitionError extends Error {
  constructor(readonly queryError: FetchBaseQueryError) {
    super('Unable to establish CSRF protection');
  }
}

function requestDetails(args: string | FetchArgs): { url: string; method: string } {
  if (typeof args === 'string') return { url: args, method: 'GET' };
  return { url: args.url, method: (args.method ?? 'GET').toUpperCase() };
}

function csrfScope(url: string): CsrfScope {
  const normalized = url.replace(/^\/+/, '');
  return normalized.startsWith('admin/') ? 'admin' : 'customer';
}

function isCsrfEndpoint(url: string): boolean {
  return /^(?:\/+)?(?:admin|customer)\/auth\/csrf(?:\?|$)/.test(url);
}

function isCsrfResponse(value: unknown): value is CsrfTokenResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.csrfToken === 'string' &&
    candidate.csrfToken.length > 0 &&
    typeof candidate.expiresInSeconds === 'number' &&
    Number.isFinite(candidate.expiresInSeconds) &&
    candidate.expiresInSeconds > 0
  );
}

function problemCode(error: FetchBaseQueryError): string | undefined {
  if (!('data' in error) || !error.data || typeof error.data !== 'object') return undefined;
  return (error.data as ApiProblem).code;
}

function isCsrfFailure(error: FetchBaseQueryError): boolean {
  return (
    error.status === 403 &&
    ['CSRF_TOKEN_INVALID', 'CUSTOMER_CSRF_TOKEN_INVALID'].includes(problemCode(error) ?? '')
  );
}

function withCsrfHeader(args: string | FetchArgs, token: string): FetchArgs {
  const request = typeof args === 'string' ? { url: args } : args;
  const headers = new Headers();
  if (request.headers instanceof Headers) {
    request.headers.forEach((value, key) => headers.set(key, value));
  } else if (Array.isArray(request.headers)) {
    for (const entry of request.headers) {
      const [key, value] = entry;
      if (key && value !== undefined) headers.set(key, value);
    }
  } else if (request.headers) {
    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) headers.set(key, value);
    }
  }
  headers.set('X-CSRF-Token', token);
  return { ...request, headers };
}

async function issueCsrfToken(
  scope: CsrfScope,
  api: BaseQueryApi,
  extraOptions: object,
): Promise<string> {
  const existing = csrfTokenManager.get(scope);
  if (existing) return existing;

  const pending = pendingCsrfRequests.get(scope);
  if (pending) return pending;

  const request = (async (): Promise<string> => {
    const result = await rawBaseQuery(
      { url: `${scope}/auth/csrf`, method: 'GET' },
      api,
      extraOptions,
    );
    if (result.error) throw new CsrfAcquisitionError(result.error);
    if (!isCsrfResponse(result.data)) throw new Error('The API returned an invalid CSRF response');
    csrfTokenManager.set(scope, result.data.csrfToken, result.data.expiresInSeconds);
    return result.data.csrfToken;
  })();

  pendingCsrfRequests.set(scope, request);
  try {
    return await request;
  } finally {
    pendingCsrfRequests.delete(scope);
  }
}

const executeWithCsrf: RichCultureBaseQuery = async (args, api, extraOptions) => {
  const request = requestDetails(args);
  if (safeMethods.has(request.method) || isCsrfEndpoint(request.url)) {
    return rawBaseQuery(args, api, extraOptions);
  }

  const scope = csrfScope(request.url);
  let token: string;
  try {
    token = await issueCsrfToken(scope, api, extraOptions);
  } catch (error) {
    return {
      error:
        error instanceof CsrfAcquisitionError
          ? error.queryError
          : { status: 'CUSTOM_ERROR', error: 'Unable to establish CSRF protection' },
    };
  }
  let result = await rawBaseQuery(withCsrfHeader(args, token), api, extraOptions);

  if (result.error && isCsrfFailure(result.error)) {
    csrfTokenManager.clear(scope);
    let refreshedToken: string;
    try {
      refreshedToken = await issueCsrfToken(scope, api, extraOptions);
    } catch (error) {
      return {
        error:
          error instanceof CsrfAcquisitionError
            ? error.queryError
            : { status: 'CUSTOM_ERROR', error: 'Unable to refresh CSRF protection' },
      };
    }
    result = await rawBaseQuery(withCsrfHeader(args, refreshedToken), api, extraOptions);
  }

  return result;
};

function canRefreshCustomerSession(url: string): boolean {
  const normalized = url.replace(/^\/+/, '').split('?')[0];
  return (
    normalized === 'customer/auth/me' ||
    normalized === 'repair/bookings' ||
    normalized.startsWith('repair/bookings/') ||
    normalized === 'customer/auth/password' ||
    normalized === 'customer/addresses' ||
    normalized.startsWith('customer/addresses/') ||
    normalized === 'checkout' ||
    normalized.startsWith('checkout/') ||
    normalized === 'customer/orders' ||
    normalized.startsWith('customer/orders/')
  );
}

function canRefreshAdminSession(url: string): boolean {
  const normalized = url.replace(/^\/+/, '').split('?')[0];
  return (
    normalized === 'admin/auth/me' ||
    normalized === 'admin/auth/password' ||
    normalized === 'admin/auth/logout-all' ||
    (normalized.startsWith('admin/') && !normalized.startsWith('admin/auth/'))
  );
}

async function refreshCustomerSession(api: BaseQueryApi, extraOptions: object): Promise<boolean> {
  if (pendingCustomerRefresh) return pendingCustomerRefresh;
  pendingCustomerRefresh = (async () => {
    const result = await executeWithCsrf(
      { url: 'customer/auth/refresh', method: 'POST' },
      api,
      extraOptions,
    );
    return !result.error;
  })();
  try {
    return await pendingCustomerRefresh;
  } finally {
    pendingCustomerRefresh = undefined;
  }
}

async function refreshAdminSession(api: BaseQueryApi, extraOptions: object): Promise<boolean> {
  if (pendingAdminRefresh) return pendingAdminRefresh;
  pendingAdminRefresh = (async () => {
    const result = await executeWithCsrf(
      { url: 'admin/auth/refresh', method: 'POST' },
      api,
      extraOptions,
    );
    return !result.error;
  })();
  try {
    return await pendingAdminRefresh;
  } finally {
    pendingAdminRefresh = undefined;
  }
}

export const csrfAwareBaseQuery: RichCultureBaseQuery = async (args, api, extraOptions) => {
  let result = await executeWithCsrf(args, api, extraOptions);
  const request = requestDetails(args);
  if (
    result.error?.status === 401 &&
    canRefreshCustomerSession(request.url) &&
    !request.url.replace(/^\/+/, '').startsWith('customer/auth/refresh')
  ) {
    if (await refreshCustomerSession(api, extraOptions)) {
      result = await executeWithCsrf(args, api, extraOptions);
    } else {
      api.dispatch(clearCustomer());
    }
  }
  if (result.error?.status === 401 && canRefreshAdminSession(request.url)) {
    if (await refreshAdminSession(api, extraOptions)) {
      result = await executeWithCsrf(args, api, extraOptions);
    } else {
      api.dispatch(clearAdmin());
    }
  }
  return result;
};
