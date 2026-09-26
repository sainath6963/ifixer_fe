import { apiErrorMessage, formatPrice, formatPriceRange, resolveMediaUrl } from './commerce';

describe('commerce presentation helpers', () => {
  it('formats paise as Indian rupees', () => {
    expect(formatPrice(149900)).toContain('1,499');
    expect(formatPriceRange({ minInPaise: 149900, maxInPaise: 199900, currency: 'INR' })).toContain(
      '1,999',
    );
  });

  it('keeps same-origin media paths intact', () => {
    expect(resolveMediaUrl('/api/v1/media/example/card')).toBe('/api/v1/media/example/card');
  });

  it('turns proxy upload failures into safe user-facing messages', () => {
    expect(
      apiErrorMessage(
        {
          status: 'PARSING_ERROR',
          originalStatus: 413,
          data: '<html>Request Entity Too Large</html>',
          error: 'SyntaxError: Unexpected token',
        },
        'Upload failed.',
      ),
    ).toBe('The selected file is too large.');
    expect(
      apiErrorMessage(
        {
          status: 'PARSING_ERROR',
          originalStatus: 502,
          data: '<html>Bad Gateway</html>',
          error: 'SyntaxError: Unexpected token',
        },
        'Upload failed.',
      ),
    ).toBe('Upload failed.');
  });
});
