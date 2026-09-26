export function newBookingCredentials() {
  return {
    idempotencyKey: crypto.randomUUID(),
    manageToken: Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) =>
      value.toString(16).padStart(2, '0'),
    ).join(''),
  };
}
export function visitToIso(value: string): string | undefined {
  return value ? new Date(`${value}:00+05:30`).toISOString() : undefined;
}
export function formatVisit(value?: string): string {
  return value
    ? new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(value)) + ' IST'
    : 'To be arranged';
}
export function repairPrice(value?: number): string {
  return value === undefined
    ? 'Diagnosis required'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(value / 100);
}
export function repairError(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object' &&
    'message' in error.data &&
    Array.isArray(error.data.message)
  ) {
    const messages = error.data.message.filter(
      (message): message is string => typeof message === 'string',
    );
    if (messages.length) return messages.join('. ');
  }
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object' &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  )
    return error.data.message;
  return 'Unable to complete this request. Check your connection and try again.';
}
export function saveBookingAccess(reference: string, token: string): void {
  try {
    sessionStorage.setItem(`ifixer:booking:${reference}`, token);
  } catch {
    /* The access code is also shown for the customer to save. */
  }
}
export function readBookingAccess(reference: string): string {
  try {
    return sessionStorage.getItem(`ifixer:booking:${reference}`) ?? '';
  } catch {
    return '';
  }
}
