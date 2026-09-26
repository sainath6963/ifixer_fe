export function safeCustomerReturnPath(value: unknown): string {
  if (typeof value !== 'string') return '/account';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/account';
  return value;
}
