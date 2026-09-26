import type { Page, Route } from '@playwright/test';

const emptyCart = {
  cart: {
    id: 'e2e-cart',
    version: 0,
    items: [],
    totalQuantity: 0,
    subtotalPaise: 0,
    readyForCheckout: false,
  },
};

const emptyPage = {
  items: [],
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0,
};

async function json(route: Route, status: number, body: object): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function installAnonymousApiStubs(page: Page): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname.endsWith('/customer/auth/csrf') || pathname.endsWith('/admin/auth/csrf')) {
      await json(route, 200, { csrfToken: 'e2e-csrf-token', expiresInSeconds: 7200 });
      return;
    }

    if (pathname.includes('/customer/auth/') || pathname.includes('/admin/auth/')) {
      await json(route, 401, { code: 'UNAUTHENTICATED', message: 'Authentication required' });
      return;
    }

    if (pathname.endsWith('/cart')) {
      await json(route, 200, emptyCart);
      return;
    }

    if (pathname.endsWith('/repair/reels')) {
      await json(route, 200, emptyPage);
      return;
    }

    if (pathname.endsWith('/repair/catalog')) {
      await json(route, 200, { brands: [], models: [], services: [], options: [] });
      return;
    }

    if (pathname.endsWith('/catalog/categories')) {
      await json(route, 200, { categories: [] });
      return;
    }

    if (pathname.endsWith('/catalog/products/featured')) {
      await json(route, 200, { ...emptyPage, limit: 4 });
      return;
    }

    if (pathname.endsWith('/catalog/products')) {
      await json(route, 200, emptyPage);
      return;
    }

    await json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: pathname });
  });
}
