import { safeCustomerReturnPath } from './auth-navigation';

describe('customer auth return navigation', () => {
  it('allows an internal route including its query and fragment', () => {
    expect(safeCustomerReturnPath('/checkout?step=address#contact')).toBe(
      '/checkout?step=address#contact',
    );
  });

  it.each([
    'https://malicious.example/account',
    '//malicious.example/account',
    '/\\malicious.example/account',
    undefined,
  ])('falls back to the account for an unsafe target', (target) => {
    expect(safeCustomerReturnPath(target)).toBe('/account');
  });
});
