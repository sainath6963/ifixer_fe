import { z } from 'zod';

const environmentSchema = z.object({
  VITE_APP_NAME: z.string().trim().min(1).max(120).default('iFixer'),
  VITE_API_BASE_URL: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) => value.startsWith('/') || /^https?:\/\//i.test(value),
      'VITE_API_BASE_URL must be root-relative or use HTTP(S)',
    )
    .default('/api/v1'),
});

export function normalizeApiBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

export function parseEnvironment(input: Record<string, unknown>): {
  appName: string;
  apiBaseUrl: string;
} {
  const parsed = environmentSchema.parse(input);
  return {
    appName: parsed.VITE_APP_NAME,
    apiBaseUrl: normalizeApiBaseUrl(parsed.VITE_API_BASE_URL),
  };
}

export const environment = parseEnvironment(import.meta.env);
