export function safeAdminReturnPath(value: unknown): string {
  if (typeof value !== 'string') return '/admin';
  if (!value.startsWith('/admin') || value.startsWith('//') || value.includes('\\'))
    return '/admin';
  return value;
}

export function canOpenAdminPath(roles: string[], path: string): boolean {
  if (path === '/admin/repair/team') return roles.includes('OWNER');
  if (roles.some((role) => ['OWNER', 'STAFF'].includes(role))) return true;
  if (path === '/admin/repair/inventory' || path.startsWith('/admin/repair/inventory/'))
    return true;
  if (path === '/admin/repair/billing') return roles.includes('RECEPTION');
  if (path === '/admin/security') return true;
  if (path === '/admin/repair/jobs/new') return roles.includes('RECEPTION');
  if (path.endsWith('/billing/print')) return roles.includes('RECEPTION');
  if (path === '/admin/repair/jobs' || path.startsWith('/admin/repair/jobs/')) return true;
  return (
    roles.includes('RECEPTION') &&
    (path === '/admin/repair/bookings' || path.startsWith('/admin/repair/bookings/'))
  );
}
