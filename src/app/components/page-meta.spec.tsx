import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PageMeta } from './page-meta';

afterEach(() => cleanup());

describe('PageMeta', () => {
  it('clears brand preview metadata when navigating to a detail without a photo', () => {
    const { rerender } = render(
      <PageMeta title="iFixer" description="Repair services" socialPreview />,
    );
    expect(
      document.head.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    ).toMatch(/\/og\.png$/);
    expect(document.head.querySelector('meta[property="og:type"]')).toHaveAttribute(
      'content',
      'website',
    );
    rerender(<PageMeta title="Existing product" description="Product details" />);
    expect(document.head.querySelector('meta[property="og:image"]')).toBeNull();
    expect(document.head.querySelector('meta[name="twitter:image"]')).toBeNull();
  });

  it('publishes page title, description and private-route robots metadata', () => {
    render(<PageMeta title="Your account" description="Private account" noIndex />);

    expect(document.title).toBe('Your account | iFixer');
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Private account',
    );
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });
});
