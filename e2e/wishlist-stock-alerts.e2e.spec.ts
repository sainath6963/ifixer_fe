import { expect, test, type Page, type Route } from '@playwright/test';

const product = {
  id: 'phase18-product',
  name: 'Culture Linen Shirt',
  slug: 'culture-linen-shirt',
  excerpt: 'A considered linen shirt.',
  description: 'A considered linen shirt cut for an easy, timeless fit.',
  categories: [{ id: 'shirts', name: 'Shirts', slug: 'shirts' }],
  priceRange: { minInPaise: 149_900, maxInPaise: 159_900, currency: 'INR' },
  availability: 'IN_STOCK',
  isFeatured: true,
  tags: ['linen'],
  primaryImage: undefined,
  images: [],
  variants: [
    {
      variantId: 'phase18-variant-m',
      sku: 'RC-LINEN-M',
      title: 'Natural / M',
      attributes: [{ name: 'size', value: 'M' }],
      priceInPaise: 149_900,
      currency: 'INR',
      availability: 'IN_STOCK',
    },
    {
      variantId: 'phase18-variant-l',
      sku: 'RC-LINEN-L',
      title: 'Natural / L',
      attributes: [{ name: 'size', value: 'L' }],
      priceInPaise: 159_900,
      currency: 'INR',
      availability: 'OUT_OF_STOCK',
    },
  ],
  publishedAt: '2026-08-01T10:00:00.000Z',
};

const customer = {
  id: 'phase18-customer',
  name: 'Asha Kulkarni',
  email: 'asha@example.com',
  emailVerified: true,
};

async function json(route: Route, status: number, body: object): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installCustomerFoundation(page: Page): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/customer/auth/me')) {
      await json(route, 200, { customer });
      return;
    }
    if (pathname.endsWith('/customer/auth/csrf')) {
      await json(route, 200, { csrfToken: 'phase18-customer-csrf', expiresInSeconds: 7200 });
      return;
    }
    if (pathname.endsWith('/cart')) {
      await json(route, 200, {
        cart: {
          id: 'phase18-cart',
          version: 0,
          items: [],
          distinctItemCount: 0,
          totalQuantity: 0,
          subtotalInPaise: 0,
          currency: 'INR',
          readyForCheckout: false,
        },
      });
      return;
    }
    await route.fallback();
  });
}

test('customer saves a product and activates a variant stock alert', async ({ page }) => {
  let wishlisted = false;
  let alertActive = false;
  let wishlistWrites = 0;
  let alertWrites = 0;
  await installCustomerFoundation(page);
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/catalog/products/culture-linen-shirt')) {
      await json(route, 200, { product });
      return;
    }
    if (pathname.endsWith('/catalog/products/phase18-product/reviews')) {
      await json(route, 200, {
        items: [],
        summary: { reviewCount: 0, averageRating: 0 },
        page: 1,
        limit: 6,
        total: 0,
        totalPages: 0,
      });
      return;
    }
    if (pathname.endsWith('/customer/reviews/product/phase18-product')) {
      await json(route, 200, { eligible: false });
      return;
    }
    if (pathname.endsWith('/customer/wishlist/products/phase18-product')) {
      await json(route, 200, { wishlisted });
      return;
    }
    if (pathname.endsWith('/customer/wishlist/phase18-product')) {
      wishlistWrites += 1;
      wishlisted = request.method() === 'POST';
      await json(route, request.method() === 'POST' ? 201 : 200, { wishlisted });
      return;
    }
    if (pathname.endsWith('/customer/stock-alerts/product/phase18-product')) {
      await json(route, 200, {
        emailEligible: true,
        activeVariantIds: alertActive ? ['phase18-variant-l'] : [],
      });
      return;
    }
    if (pathname.endsWith('/customer/stock-alerts/phase18-product/variants/phase18-variant-l')) {
      alertWrites += 1;
      alertActive = request.method() === 'POST';
      await json(route, request.method() === 'POST' ? 201 : 200, {
        id: 'phase18-alert',
        productId: product.id,
        variantId: 'phase18-variant-l',
        productName: product.name,
        productSlug: product.slug,
        variantTitle: 'Natural / L',
        sku: 'RC-LINEN-L',
        status: 'ACTIVE',
        requestedAt: new Date().toISOString(),
        version: 0,
      });
      return;
    }
    await route.fallback();
  });

  await page.goto('/products/culture-linen-shirt');
  await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible();
  await page.getByRole('button', { name: '♡ Save to wishlist' }).click();
  await expect.poll(() => wishlistWrites).toBe(1);
  await expect(page.getByRole('button', { name: '♥ Saved to wishlist' })).toBeVisible();

  await page.getByRole('button', { name: /Natural \/ L Notify me/ }).click();
  await expect.poll(() => alertWrites).toBe(1);
  await expect(page.getByRole('button', { name: /Natural \/ L Alert active/ })).toBeVisible();
  await expect(page.getByText('We will email you when this option is back.')).toBeVisible();
});

test('customer reviews saved products and cancels an active alert', async ({ page }) => {
  let wishlistItems = [
    {
      id: 'phase18-wishlist-item',
      addedAt: '2026-08-10T10:00:00.000Z',
      product,
    },
  ];
  let alerts = [
    {
      id: 'phase18-alert',
      productId: product.id,
      variantId: 'phase18-variant-l',
      productName: product.name,
      productSlug: product.slug,
      variantTitle: 'Natural / L',
      sku: 'RC-LINEN-L',
      status: 'ACTIVE',
      requestedAt: '2026-08-10T10:05:00.000Z',
      version: 0,
    },
  ];
  await installCustomerFoundation(page);
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/customer/wishlist') && request.method() === 'GET') {
      await json(route, 200, {
        items: wishlistItems,
        page: 1,
        limit: 12,
        total: wishlistItems.length,
        totalPages: wishlistItems.length ? 1 : 0,
      });
      return;
    }
    if (pathname.endsWith('/customer/wishlist/phase18-product')) {
      wishlistItems = [];
      await json(route, 200, { wishlisted: false });
      return;
    }
    if (pathname.endsWith('/customer/stock-alerts') && request.method() === 'GET') {
      await json(route, 200, { alerts });
      return;
    }
    if (pathname.endsWith('/customer/stock-alerts/phase18-product/variants/phase18-variant-l')) {
      alerts = [];
      await json(route, 200, { active: false });
      return;
    }
    await route.fallback();
  });

  await page.goto('/account/wishlist');
  await expect(page.getByRole('heading', { level: 1, name: 'Saved for later.' })).toBeVisible();
  await expect(
    page.locator('.wishlist-grid').getByRole('link', { name: product.name }),
  ).toBeVisible();
  await expect(page.getByText('Natural / L · RC-LINEN-L')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel alert' }).click();
  await expect(page.getByText('You have no active stock alerts.')).toBeVisible();
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Your next favourite piece can live here.')).toBeVisible();
});

test('admin sees sold-out option demand ranked with live inventory', async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/customer/auth/me')) {
      await json(route, 401, { code: 'CUSTOMER_SESSION_REQUIRED', message: 'Sign in required' });
      return;
    }
    if (pathname.endsWith('/admin/auth/me')) {
      await json(route, 200, {
        admin: {
          id: 'phase18-owner',
          name: 'Rich Culture Owner',
          email: 'owner@example.com',
          roles: ['OWNER'],
        },
      });
      return;
    }
    if (pathname.endsWith('/admin/stock-demand')) {
      await json(route, 200, {
        items: [
          {
            productId: product.id,
            variantId: 'phase18-variant-l',
            productName: product.name,
            productSlug: product.slug,
            variantTitle: 'Natural / L',
            sku: 'RC-LINEN-L',
            subscriberCount: 14,
            available: 0,
            lastRequestedAt: '2026-08-10T10:05:00.000Z',
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      return;
    }
    await json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: pathname });
  });

  await page.goto('/admin/stock-demand');
  await expect(page.getByRole('heading', { level: 1, name: 'Stock demand' })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: product.name });
  await expect(row).toContainText('Natural / L');
  await expect(row).toContainText('RC-LINEN-L');
  await expect(row.getByText('14', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Stock demand' })).toHaveClass(/active/);
});
