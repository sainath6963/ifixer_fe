import { describe, expect, it } from 'vitest';

import { localDayEndIso, localDayStartIso, positiveAdminPage } from './admin-list-state';

describe('admin list state', () => {
  it('accepts only positive integer pages', () => {
    expect(positiveAdminPage('3')).toBe(3);
    expect(positiveAdminPage('0')).toBe(1);
    expect(positiveAdminPage('1.5')).toBe(1);
    expect(positiveAdminPage('wrong')).toBe(1);
  });

  it('creates inclusive local date boundaries', () => {
    const start = new Date(localDayStartIso('2026-08-09') ?? 'invalid');
    const end = new Date(localDayEndIso('2026-08-09') ?? 'invalid');
    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0]);
    expect([end.getHours(), end.getMinutes(), end.getSeconds(), end.getMilliseconds()]).toEqual([
      23, 59, 59, 999,
    ]);
    expect(localDayStartIso('2026-02-30')).toBeUndefined();
  });
});
