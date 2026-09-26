import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AdminPagination } from './admin-pagination';

describe('AdminPagination', () => {
  it('reports the visible range and requests the next server page', async () => {
    const onPageChange = vi.fn();
    render(
      <AdminPagination page={2} totalPages={4} total={82} limit={25} onPageChange={onPageChange} />,
    );

    expect(screen.getByText('26–50 of 82')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
