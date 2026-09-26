export const ADMIN_IMAGE_MAX_BYTES = 25 * 1024 * 1024;
export const ADMIN_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

const allowedImageTypes = new Set(ADMIN_IMAGE_ACCEPT.split(','));

export function validateAdminImage(file: Pick<File, 'size' | 'type'>): string | undefined {
  if (file.size <= 0) return 'Select a non-empty image file.';
  if (file.size > ADMIN_IMAGE_MAX_BYTES) {
    return 'Image must be 25 MB or smaller.';
  }
  if (file.type && !allowedImageTypes.has(file.type.toLowerCase())) {
    return 'Use a JPEG, PNG, WebP or AVIF image.';
  }
  return undefined;
}
