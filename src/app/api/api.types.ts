export interface ApiProblem {
  statusCode?: number;
  code?: string;
  message?: string;
  requestId?: string;
  details?: unknown;
}

export interface CsrfTokenResponse {
  csrfToken: string;
  expiresInSeconds: number;
}

export type CsrfScope = 'customer' | 'admin';
