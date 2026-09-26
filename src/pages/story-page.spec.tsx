import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Component as StoryPage } from './story-page';

describe('StoryPage', () => {
  it('keeps the old story route usable with the repair brand story', () => {
    render(
      <MemoryRouter>
        <StoryPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /Good phones deserve/i })).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('link', { name: /explore repairs/i })).toHaveAttribute(
      'href',
      '/services',
    );
  });
});
