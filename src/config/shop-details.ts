import { z } from 'zod';

const optionalPhone = z
  .string()
  .trim()
  .default('')
  .refine(
    (value) => !value || /^\+?[1-9]\d{7,14}$/.test(value),
    'Use an international phone number without spaces',
  );
const shopSchema = z.object({
  VITE_SHOP_PHONE: optionalPhone,
  VITE_SHOP_WHATSAPP: optionalPhone,
  VITE_SHOP_ADDRESS: z.string().trim().max(500).default(''),
  VITE_SHOP_HOURS: z.string().trim().max(300).default(''),
  VITE_SHOP_MAP_URL: z.union([z.literal(''), z.url({ protocol: /^https$/ })]).default(''),
});

export function parseShopDetails(input: Record<string, unknown>) {
  const values = shopSchema.parse(input);
  return {
    phone: values.VITE_SHOP_PHONE,
    phoneHref: values.VITE_SHOP_PHONE ? `tel:${values.VITE_SHOP_PHONE}` : undefined,
    whatsappHref: values.VITE_SHOP_WHATSAPP
      ? `https://wa.me/${values.VITE_SHOP_WHATSAPP.replace(/^\+/, '')}`
      : undefined,
    address: values.VITE_SHOP_ADDRESS,
    hours: values.VITE_SHOP_HOURS,
    mapUrl: values.VITE_SHOP_MAP_URL || undefined,
  };
}

export const shopDetails = parseShopDetails(import.meta.env);
