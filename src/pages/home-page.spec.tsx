import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Component as HomePage } from './home-page';

vi.mock('@/features/instagram-reels/reels-api', () => ({
  useInstagramReelsQuery: () => ({
    data: { items: [], total: 0, totalPages: 0 },
    isError: false,
  }),
}));

vi.mock('@/features/website/website-activity', () => ({
  GoogleReviewInvitation: () => null,
}));

describe('storefront home page', () => {
  it('renders the repair entry point and service navigation', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /a fresh start/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /explore repairs/i })).toHaveAttribute(
      'href',
      '/services',
    );
  });
});
