import type { CsrfScope } from './api.types';

interface CsrfEntry {
  token: string;
  expiresAt: number;
}

class CsrfTokenManager {
  private readonly tokens = new Map<CsrfScope, CsrfEntry>();

  get(scope: CsrfScope): string | undefined {
    const entry = this.tokens.get(scope);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.tokens.delete(scope);
      return undefined;
    }
    return entry.token;
  }

  set(scope: CsrfScope, token: string, expiresInSeconds: number): void {
    const safetyWindowMs = Math.min(30_000, Math.max(0, expiresInSeconds * 100));
    this.tokens.set(scope, {
      token,
      expiresAt: Date.now() + expiresInSeconds * 1000 - safetyWindowMs,
    });
  }

  clear(scope?: CsrfScope): void {
    if (scope) this.tokens.delete(scope);
    else this.tokens.clear();
  }
}

export const csrfTokenManager = new CsrfTokenManager();
