import { environment } from '@/config/environment';
import type { PriceRange } from '@/features/catalog/catalog.types';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatPrice(priceInPaise: number): string {
  return currencyFormatter.format(priceInPaise / 100);
}

export function formatPriceRange(range: PriceRange): string {
  if (range.minInPaise === range.maxInPaise) return formatPrice(range.minInPaise);
  return `${formatPrice(range.minInPaise)} – ${formatPrice(range.maxInPaise)}`;
}

export function resolveMediaUrl(source: string): string {
  if (/^(?:https?:|data:|blob:)/i.test(source)) return source;
  if (/^https?:\/\//i.test(environment.apiBaseUrl)) {
    return new URL(source, environment.apiBaseUrl).toString();
  }
  return source;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const candidate = error as Record<string, unknown>;
  const responseStatus =
    typeof candidate.status === 'number'
      ? candidate.status
      : typeof candidate.originalStatus === 'number'
        ? candidate.originalStatus
        : undefined;
  if (responseStatus === 413) return 'The selected file is too large.';
  const data = candidate.data;
  if (typeof data === 'string' && data.trim() && !/^\s*</.test(data)) return data;
  if (data && typeof data === 'object') {
    const message = (data as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) return message;
    if (Array.isArray(message))
      return message.filter((item) => typeof item === 'string').join('. ');
  }
  if (
    candidate.status !== 'PARSING_ERROR' &&
    typeof candidate.error === 'string' &&
    candidate.error.trim()
  ) {
    return candidate.error;
  }
  return fallback;
}
