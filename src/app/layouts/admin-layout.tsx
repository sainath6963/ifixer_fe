import { canOpenAdminPath } from '@/features/admin/admin-navigation';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useLogoutAdminMutation } from '@/features/admin/admin-auth-api';
import { clearAdmin } from '@/features/session/session-slice';

const navigation = [
  { label: 'Overview', to: '/admin', end: true },
  { label: 'Repair jobs', to: '/admin/repair/jobs' },
  { label: 'Billing & warranty', to: '/admin/repair/billing' },
  { label: 'Parts & inventory', to: '/admin/repair/inventory' },
  { label: 'Repair team', to: '/admin/repair/team' },
  { label: 'Repair bookings', to: '/admin/repair/bookings' },
  { label: 'Instagram reels', to: '/admin/repair/reels' },
  { label: 'Repair catalog', to: '/admin/repair/services' },
  { label: 'Customers', to: '/admin/customers' },
  { label: 'Notifications', to: '/admin/notifications' },
  { label: 'Security', to: '/admin/security' },
];

const retailNavigation = [
  { label: 'Analytics', to: '/admin/analytics' },
  { label: 'Catalog', to: '/admin/catalog' },
  { label: 'Promotions', to: '/admin/promotions' },
  { label: 'Reviews', to: '/admin/reviews' },
  { label: 'Stock demand', to: '/admin/stock-demand' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Returns', to: '/admin/returns' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openLocation, setOpenLocation] = useState<string | null>(null);
  const menuOpen = openLocation === location.key;
  const menuButton = useRef<HTMLButtonElement>(null);
  const dispatch = useAppDispatch();
  const admin = useAppSelector((state) => state.session.admin);
  const [logout, logoutState] = useLogoutAdminMutation();

  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenLocation(null);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [menuOpen]);

  async function signOut() {
    try {
      await logout().unwrap();
      dispatch(clearAdmin());
      await navigate('/admin/login', { replace: true });
    } catch {
      // The session remains active and the admin can retry.
    }
  }

  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main-content">
        Skip to admin content
      </a>
      <aside className="admin-sidebar">
        <div className="admin-sidebar__top">
          <NavLink className="brand brand--admin" to="/admin">
            <span className="brand__mark" aria-hidden="true">
              iF
            </span>
            <span className="brand__name">iFixer</span>
          </NavLink>
          <button
            ref={menuButton}
            className="admin-menu-button"
            type="button"
            aria-controls="admin-navigation-panel"
            aria-expanded={menuOpen}
            onClick={() => setOpenLocation(menuOpen ? null : location.key)}
          >
            {menuOpen ? 'Close menu' : 'Admin menu'}
          </button>
        </div>
        <div className="admin-navigation-panel" id="admin-navigation-panel" data-open={menuOpen}>
          <p className="admin-sidebar__label">Shop operations</p>
          <nav aria-label="Admin navigation" onClick={() => setOpenLocation(null)}>
            {navigation
              .filter((item) => canOpenAdminPath(admin?.roles ?? [], item.to))
              .map((item) => (
                <NavLink end={item.end} key={item.to} to={item.to}>
                  {item.label}
                </NavLink>
              ))}
            {admin?.roles.some((role) => ['OWNER', 'STAFF'].includes(role)) && (
              <span className="admin-nav-group">Previous store</span>
            )}
            {retailNavigation
              .filter((item) => canOpenAdminPath(admin?.roles ?? [], item.to))
              .map((item) => (
                <NavLink key={item.to} to={item.to}>
                  {item.label}
                </NavLink>
              ))}
          </nav>
          <div className="admin-sidebar__identity">
            <p>{admin?.name}</p>
            <span>{admin?.roles.join(' / ')}</span>
            <button type="button" disabled={logoutState.isLoading} onClick={() => void signOut()}>
              {logoutState.isLoading ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
          <NavLink className="admin-sidebar__store" to="/">
            View website ↗
          </NavLink>
        </div>
      </aside>
      <main className="admin-content" id="admin-main-content">
        <Outlet />
      </main>
    </div>
  );
}
