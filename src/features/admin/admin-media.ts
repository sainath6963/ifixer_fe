import { resolveMediaUrl } from '@/shared/commerce';

import type { AdminMediaAsset } from './admin.types';

export function adminMediaPreview(asset: AdminMediaAsset): string {
  const preview =
    asset.variants.find(({ name }) => name === 'thumbnail') ??
    asset.variants.find(({ name }) => name === 'card');
  return resolveMediaUrl(preview?.url ?? asset.originalUrl);
}
