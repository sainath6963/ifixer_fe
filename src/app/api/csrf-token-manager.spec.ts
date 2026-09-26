import { csrfTokenManager } from './csrf-token-manager';

describe('CSRF token manager', () => {
  beforeEach(() => csrfTokenManager.clear());
  afterEach(() => {
    csrfTokenManager.clear();
    vi.useRealTimers();
  });

  it('keeps customer and admin tokens in separate memory-only scopes', () => {
    csrfTokenManager.set('customer', 'customer-token', 600);
    csrfTokenManager.set('admin', 'admin-token', 600);

    expect(csrfTokenManager.get('customer')).toBe('customer-token');
    expect(csrfTokenManager.get('admin')).toBe('admin-token');
    csrfTokenManager.clear('customer');
    expect(csrfTokenManager.get('customer')).toBeUndefined();
    expect(csrfTokenManager.get('admin')).toBe('admin-token');
  });

  it('does not return expired tokens', () => {
    vi.useFakeTimers();
    csrfTokenManager.set('customer', 'short-token', 1);
    vi.advanceTimersByTime(1_001);
    expect(csrfTokenManager.get('customer')).toBeUndefined();
  });
});
