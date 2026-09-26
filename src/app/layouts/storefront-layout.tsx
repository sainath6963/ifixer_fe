import { useEffect, useRef } from 'react';
import { NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { setMobileMenuOpen } from '@/features/ui/ui-slice';
import { useAppDispatch, useAppSelector } from '../hooks';

const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'Book a repair', to: '/book-repair' },
  { label: 'About iFixer', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export function StorefrontLayout() {
  const dispatch = useAppDispatch();
  const menuOpen = useAppSelector((state) => state.ui.mobileMenuOpen);
  const customer = useAppSelector((state) => state.session.customer);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const closeMenu = () => dispatch(setMobileMenuOpen(false));

  useEffect(() => {
    dispatch(setMobileMenuOpen(false));
  }, [dispatch, location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch(setMobileMenuOpen(false));
        menuButton.current?.focus();
      }
    };
    const query = window.matchMedia('(min-width: 961px)');
    const closeOnDesktop = () => {
      if (query.matches) dispatch(setMobileMenuOpen(false));
    };
    window.addEventListener('keydown', closeOnEscape);
    query.addEventListener('change', closeOnDesktop);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      query.removeEventListener('change', closeOnDesktop);
    };
  }, [dispatch, menuOpen]);

  return (
    <>
      <div className="site-shell repair-site">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="repair-announcement">A little care. A longer life for your phone.</div>
        <header className="site-header repair-header">
          <NavLink className="brand" to="/" aria-label="iFixer home" onClick={closeMenu}>
            <span className="brand__mark" aria-hidden="true">
              iF
            </span>
            <span className="brand__name">
              iFixer<span className="brand__dot">.</span>
            </span>
          </NavLink>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navigation.map((item) => (
              <NavLink end={item.to === '/'} key={item.to} to={item.to} onClick={closeMenu}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <NavLink className="repair-account-link" to="/account" onClick={closeMenu}>
              {customer?.name?.split(' ')[0] || 'My account'} <span aria-hidden="true">↗</span>
            </NavLink>
            <button
              ref={menuButton}
              className="menu-button"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => dispatch(setMobileMenuOpen(!menuOpen))}
            >
              {menuOpen ? 'Close' : 'Menu'} <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
            </button>
          </div>
          <nav
            className="mobile-nav"
            id="mobile-navigation"
            aria-label="Mobile navigation"
            data-open={menuOpen}
          >
            {navigation.map((item) => (
              <NavLink end={item.to === '/'} key={item.to} to={item.to} onClick={closeMenu}>
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/account" onClick={closeMenu}>
              My account
            </NavLink>
          </nav>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="site-footer repair-footer">
          <div>
            <NavLink className="brand" to="/" aria-label="iFixer home">
              <span className="brand__name">iFixer.</span>
            </NavLink>
            <p>
              A fresh start for your phone.
              <br />A little less interruption to your day.
            </p>
          </div>
          <nav className="repair-footer__nav" aria-label="Footer navigation">
            <div>
              <p>EXPLORE</p>
              <NavLink to="/services">Repair services</NavLink>
              <NavLink to="/book-repair">Book a repair</NavLink>
              <NavLink to="/about">About iFixer</NavLink>
              <NavLink to="/contact">Contact</NavLink>
            </div>
            <div>
              <p>YOUR ACCOUNT</p>
              <NavLink to="/account">My account</NavLink>
              <NavLink to="/account/orders">Order history</NavLink>
              <details className="repair-legacy-links">
                <summary>Previous store</summary>
                <NavLink to="/catalog">Store catalog</NavLink>
                <NavLink to="/cart">Shopping bag</NavLink>
                <NavLink to="/account/wishlist">Saved products</NavLink>
              </details>
            </div>
          </nav>
          <div className="repair-footer__bottom">
            <p>© {new Date().getFullYear()} iFixer. All rights reserved.</p>
            <span>CARE THAT KEEPS YOU CONNECTED.</span>
          </div>
        </footer>
      </div>
      <ScrollRestoration />
    </>
  );
}
