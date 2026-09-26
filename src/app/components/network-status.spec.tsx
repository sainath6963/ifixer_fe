import { act, render, screen } from '@testing-library/react';

import { NetworkStatus } from './network-status';

function setOnline(value: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('network status', () => {
  afterEach(() => setOnline(true));

  it('warns while offline and clears the warning when connectivity returns', () => {
    setOnline(false);
    render(<NetworkStatus />);

    expect(screen.getByRole('status')).toHaveTextContent(/you’re offline/i);

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
