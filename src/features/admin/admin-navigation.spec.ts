import { safeAdminReturnPath } from './admin-navigation';

describe('admin return navigation', () => {
  it('allows only internal admin paths', () => {
    expect(safeAdminReturnPath('/admin/orders?status=PAID')).toBe('/admin/orders?status=PAID');
    expect(safeAdminReturnPath('/catalog')).toBe('/admin');
    expect(safeAdminReturnPath('//malicious.example')).toBe('/admin');
  });
});
