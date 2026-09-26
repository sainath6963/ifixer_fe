import { createBrowserRouter } from 'react-router-dom';

import { RouteErrorPage } from './components/route-error-page';
import { AdminRoute, CustomerRoute } from './components/session-route';
import { AdminLayout } from './layouts/admin-layout';
import { AdminSessionLayout } from './layouts/admin-session-layout';
import { StorefrontLayout } from './layouts/storefront-layout';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: StorefrontLayout,
    ErrorBoundary: RouteErrorPage,
    children: [
      { index: true, lazy: () => import('@/pages/home-page') },
      { path: 'services', lazy: () => import('@/pages/services-page') },
      { path: 'book-repair', lazy: () => import('@/pages/book-repair-page') },
      { path: 'book-repair/:reference', lazy: () => import('@/pages/repair-booking-page') },
      { path: 'about', lazy: () => import('@/pages/about-page') },
      { path: 'contact', lazy: () => import('@/pages/contact-page') },
      { path: 'reels', lazy: () => import('@/pages/reels-page') },
      { path: 'catalog', lazy: () => import('@/pages/catalog-page') },
      { path: 'products/:slug', lazy: () => import('@/pages/product-detail-page') },
      { path: 'collections', lazy: () => import('@/pages/catalog-page') },
      { path: 'story', lazy: () => import('@/pages/story-page') },
      { path: 'search', lazy: () => import('@/pages/catalog-page') },
      { path: 'login', lazy: () => import('@/pages/customer-auth-page') },
      { path: 'register', lazy: () => import('@/pages/customer-auth-page') },
      { path: 'forgot-password', lazy: () => import('@/pages/customer-account-action-page') },
      { path: 'reset-password', lazy: () => import('@/pages/customer-account-action-page') },
      { path: 'verify-email', lazy: () => import('@/pages/customer-account-action-page') },
      { path: 'change-email', lazy: () => import('@/pages/customer-account-action-page') },
      {
        Component: CustomerRoute,
        children: [
          { path: 'account', lazy: () => import('@/pages/customer-account-page') },
          { path: 'account/wishlist', lazy: () => import('@/pages/customer-wishlist-page') },
          { path: 'account/orders', lazy: () => import('@/pages/customer-orders-page') },
          { path: 'orders/:orderNumber', lazy: () => import('@/pages/customer-order-page') },
          { path: 'checkout', lazy: () => import('@/pages/checkout-page') },
        ],
      },
      { path: 'cart', lazy: () => import('@/pages/cart-page') },
      { path: '*', lazy: () => import('@/pages/not-found-page') },
    ],
  },
  {
    path: '/admin',
    Component: AdminSessionLayout,
    ErrorBoundary: RouteErrorPage,
    children: [
      { path: 'login', lazy: () => import('@/pages/admin-login-page') },
      {
        Component: AdminRoute,
        children: [
          {
            Component: AdminLayout,
            children: [
              { index: true, lazy: () => import('@/pages/admin-dashboard-page') },
              { path: 'repair/reels', lazy: () => import('@/pages/admin-instagram-reels-page') },
              { path: 'repair/billing', lazy: () => import('@/pages/admin-repair-billing-page') },
              {
                path: 'repair/jobs/:number/billing/print',
                lazy: () => import('@/pages/admin-repair-invoice-print-page'),
              },
              { path: 'repair/jobs', lazy: () => import('@/pages/admin-repair-jobs-page') },
              { path: 'repair/jobs/new', lazy: () => import('@/pages/admin-repair-intake-page') },
              { path: 'repair/jobs/:number', lazy: () => import('@/pages/admin-repair-job-page') },
              {
                path: 'repair/inventory',
                lazy: () => import('@/pages/admin-repair-inventory-page'),
              },
              {
                path: 'repair/inventory/parts/:id',
                lazy: () => import('@/pages/admin-repair-part-page'),
              },
              {
                path: 'repair/inventory/purchases/:id',
                lazy: () => import('@/pages/admin-repair-purchase-page'),
              },
              { path: 'repair/team', lazy: () => import('@/pages/admin-repair-team-page') },
              { path: 'repair/services', lazy: () => import('@/pages/admin-repair-catalog-page') },
              { path: 'repair/bookings', lazy: () => import('@/pages/admin-repair-bookings-page') },
              {
                path: 'repair/bookings/:reference',
                lazy: () => import('@/pages/repair-booking-page'),
              },
              { path: 'analytics', lazy: () => import('@/pages/admin-analytics-page') },
              { path: 'catalog', lazy: () => import('@/pages/admin-catalog-page') },
              {
                path: 'catalog/products/:productId',
                lazy: () => import('@/pages/admin-product-editor-page'),
              },
              {
                path: 'catalog/categories/:categoryId',
                lazy: () => import('@/pages/admin-category-editor-page'),
              },
              { path: 'catalog/media', lazy: () => import('@/pages/admin-media-page') },
              { path: 'promotions', lazy: () => import('@/pages/admin-promotions-page') },
              { path: 'reviews', lazy: () => import('@/pages/admin-reviews-page') },
              { path: 'stock-demand', lazy: () => import('@/pages/admin-stock-demand-page') },
              { path: 'customers', lazy: () => import('@/pages/admin-customers-page') },
              {
                path: 'customers/:customerId',
                lazy: () => import('@/pages/admin-customer-detail-page'),
              },
              { path: 'orders', lazy: () => import('@/pages/admin-orders-page') },
              { path: 'returns', lazy: () => import('@/pages/admin-returns-page') },
              {
                path: 'returns/:returnNumber',
                lazy: () => import('@/pages/admin-return-detail-page'),
              },
              {
                path: 'orders/:orderNumber',
                lazy: () => import('@/pages/admin-order-detail-page'),
              },
              { path: 'notifications', lazy: () => import('@/pages/admin-notifications-page') },
              { path: 'security', lazy: () => import('@/pages/admin-security-page') },
            ],
          },
        ],
      },
    ],
  },
]);
