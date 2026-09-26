import { canOpenAdminPath } from '@/features/admin/admin-navigation';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAppSelector } from '../hooks';
import { RouteLoading } from './route-loading';

export function CustomerRoute({ children }: { children?: ReactNode }) {
  const status = useAppSelector((state) => state.session.customerStatus);
  const location = useLocation();
  if (status === 'unknown') return <RouteLoading />;
  if (status === 'anonymous') {
    return (
      <Navigate
        replace
        to="/login"
        state={{ returnTo: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }
  return children ?? <Outlet />;
}

export function AdminRoute({ children }: { children?: ReactNode }) {
  const status = useAppSelector((state) => state.session.adminStatus);
  const roles = useAppSelector((state) => state.session.admin?.roles ?? []);
  const location = useLocation();
  if (status === 'unknown') return <RouteLoading />;
  if (status === 'anonymous') {
    return (
      <Navigate
        replace
        to="/admin/login"
        state={{ returnTo: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }
  if (!canOpenAdminPath(roles, location.pathname))
    return <Navigate replace to="/admin/repair/jobs" />;
  return children ?? <Outlet />;
}
