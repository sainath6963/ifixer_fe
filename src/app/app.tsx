import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';

import { RouteLoading } from './components/route-loading';
import { router } from './router';

export function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
