import type { ReactNode } from 'react';
import { Provider } from 'react-redux';

import { NetworkStatus } from '../components/network-status';
import { store } from '../store';
import { CustomerSessionBootstrap } from './customer-session-bootstrap';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <NetworkStatus />
      <CustomerSessionBootstrap>{children}</CustomerSessionBootstrap>
    </Provider>
  );
}
