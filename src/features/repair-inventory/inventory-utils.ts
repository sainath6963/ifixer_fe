import { useAppSelector } from '@/app/hooks';
import { rupeesToPaise } from '@/features/admin/admin-form-utils';
export const field = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
};
export function amount(data: FormData, key: string, optional = false) {
  const value = field(data, key);
  if (!value && optional) return undefined;
  const result = rupeesToPaise(value);
  if (result === undefined) throw new Error('Enter rupees with at most two decimal places.');
  return result;
}
export const money = (value?: number) =>
  value === undefined
    ? 'Unknown cost'
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value / 100);
export function useStockManager() {
  return useAppSelector(
    (s) => s.session.admin?.roles.some((r) => ['OWNER', 'STAFF'].includes(r)) ?? false,
  );
}
