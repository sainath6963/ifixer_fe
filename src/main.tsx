import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/app';
import { AppErrorBoundary } from './app/providers/app-error-boundary';
import { AppProviders } from './app/providers/app-providers';
import './styles/global.css';
import './styles/repair.css';
import './styles/repair-jobs.css';
import './styles/repair-inventory.css';
import './styles/repair-billing.css';
import './styles/instagram-reels.css';

const root = document.getElementById('root');
if (!root) throw new Error('Application root element was not found');

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </AppErrorBoundary>
  </StrictMode>,
);
