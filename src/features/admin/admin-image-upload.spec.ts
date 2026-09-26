import { ADMIN_IMAGE_MAX_BYTES, validateAdminImage } from './admin-image-upload';

describe('admin image upload validation', () => {
  it('accepts supported images up to the server limit', () => {
    expect(validateAdminImage({ size: ADMIN_IMAGE_MAX_BYTES, type: 'image/jpeg' })).toBeUndefined();
    expect(validateAdminImage({ size: 1024, type: 'image/avif' })).toBeUndefined();
  });

  it('rejects empty, oversized, and unsupported files before upload', () => {
    expect(validateAdminImage({ size: 0, type: 'image/png' })).toContain('non-empty');
    expect(validateAdminImage({ size: ADMIN_IMAGE_MAX_BYTES + 1, type: 'image/webp' })).toContain(
      '25 MB',
    );
    expect(validateAdminImage({ size: 1024, type: 'application/pdf' })).toContain(
      'JPEG, PNG, WebP or AVIF',
    );
  });

  it('allows an empty browser MIME type and leaves byte validation to the API', () => {
    expect(validateAdminImage({ size: 1024, type: '' })).toBeUndefined();
  });
});
