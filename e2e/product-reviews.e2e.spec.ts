import { expect, test, type Page, type Route } from '@playwright/test';

const product = {
  id: 'phase17-product',
  name: 'Culture Linen Shirt',
  slug: 'culture-linen-shirt',
  excerpt: 'A considered linen shirt.',
  description: 'A considered linen shirt cut for an easy, timeless fit.',
  categories: [{ id: 'shirts', name: 'Shirts', slug: 'shirts' }],
  priceRange: { minInPaise: 149_900, maxInPaise: 149_900, currency: 'INR' },
  availability: 'IN_STOCK',
  isFeatured: true,
  tags: ['linen'],
  primaryImage: undefined,
  images: [],
  variants: [
    {
      variantId: 'phase17-variant',
      sku: 'RC-LINEN-M',
      title: 'Natural / M',
      attributes: [{ name: 'size', value: 'M' }],
      priceInPaise: 149_900,
      currency: 'INR',
      availability: 'IN_STOCK',
    },
  ],
  publishedAt: '2026-08-01T10:00:00.000Z',
};

async function json(route: Route, status: number, body: object): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test('delivered-order customer submits a verified review from the product page', async ({
  page,
}) => {
  let submittedReview:
    | {
        id: string;
        productId: string;
        productName: string;
        productSlug: string;
        orderNumber: string;
        rating: number;
        title: string;
        body: string;
        status: 'PENDING';
        version: number;
        createdAt: string;
        updatedAt: string;
      }
    | undefined;
  let createRequests = 0;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/customer/auth/me')) {
      await json(route, 200, {
        customer: {
          id: 'phase17-customer',
          name: 'Asha Kulkarni',
          email: 'asha@example.com',
          emailVerified: true,
        },
      });
      return;
    }
    if (pathname.endsWith('/customer/auth/csrf')) {
      await json(route, 200, { csrfToken: 'phase17-customer-csrf', expiresInSeconds: 7200 });
      return;
    }
    if (pathname.endsWith('/cart')) {
      await json(route, 200, {
        cart: {
          id: 'phase17-cart',
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
    if (pathname.endsWith('/catalog/products/phase17-product/reviews')) {
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
    if (pathname.endsWith('/catalog/products/culture-linen-shirt')) {
      await json(route, 200, { product });
      return;
    }
    if (pathname.endsWith('/customer/reviews/product/phase17-product')) {
      await json(route, 200, {
        eligible: true,
        deliveredOrderNumber: 'RC-20260810-REVIEW1701',
        review: submittedReview,
      });
      return;
    }
    if (pathname.endsWith('/customer/reviews') && request.method() === 'POST') {
      createRequests += 1;
      const input = request.postDataJSON() as {
        productId: string;
        rating: number;
        title: string;
        body: string;
      };
      const now = new Date().toISOString();
      submittedReview = {
        id: 'phase17-review',
        productId: input.productId,
        productName: product.name,
        productSlug: product.slug,
        orderNumber: 'RC-20260810-REVIEW1701',
        rating: input.rating,
        title: input.title,
        body: input.body,
        status: 'PENDING',
        version: 0,
        createdAt: now,
        updatedAt: now,
      };
      await json(route, 201, submittedReview);
      return;
    }
    await json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: pathname });
  });

  await page.goto('/products/culture-linen-shirt');
  await expect(
    page.getByRole('heading', { level: 2, name: 'Verified buyer reviews' }),
  ).toBeVisible();
  await expect(page.getByText('Verified order RC-20260810-REVIEW1701')).toBeVisible();
  await page.getByLabel('Rating').selectOption('4');
  await page.getByLabel('Review title').fill('Beautiful relaxed fit');
  await page
    .getByLabel('Your experience')
    .fill('The linen and finishing feel excellent, with a comfortable relaxed cut.');
  await page.getByRole('button', { name: 'Submit review' }).click();

  await expect.poll(() => createRequests).toBe(1);
  await expect(
    page.getByText('your verified review is awaiting moderation', { exact: false }),
  ).toBeVisible();
  await expect(page.getByText('Awaiting moderation', { exact: true })).toBeVisible();
});

test('admin publishes a pending verified review from the moderation queue', async ({ page }) => {
  const now = new Date().toISOString();
  const rows = [
    {
      id: 'phase17-review',
      productId: 'phase17-product',
      productName: product.name,
      productSlug: product.slug,
      customerId: 'phase17-customer',
      orderId: 'phase17-order',
      orderNumber: 'RC-20260810-REVIEW1701',
      displayName: 'Asha K.',
      rating: 4,
      title: 'Beautiful relaxed fit',
      body: 'The linen and finishing feel excellent, with a comfortable relaxed cut.',
      status: 'PENDING',
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];
  let publishRequests = 0;
  await installAdminReviewStubs(page, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/admin/reviews') && request.method() === 'GET') {
      await json(route, 200, {
        items: rows,
        page: 1,
        limit: 20,
        total: rows.length,
        totalPages: rows.length ? 1 : 0,
      });
      return true;
    }
    if (pathname.endsWith('/admin/reviews/phase17-review/moderation')) {
      publishRequests += 1;
      rows[0] = {
        ...rows[0],
        status: 'PUBLISHED',
        version: 1,
        updatedAt: new Date().toISOString(),
      };
      await json(route, 200, rows[0]);
      return true;
    }
    return false;
  });

  await page.goto('/admin/reviews');
  await expect(page.getByRole('heading', { level: 1, name: 'Product reviews' })).toBeVisible();
  await expect(page.getByText('Beautiful relaxed fit')).toBeVisible();
  await expect(page.getByRole('link', { name: 'RC-20260810-REVIEW1701' })).toBeVisible();
  await page.getByRole('button', { name: 'Publish' }).click();

  await expect.poll(() => publishRequests).toBe(1);
  await expect(page.getByText(`Review for ${product.name} is now published.`)).toBeVisible();
  await expect(page.getByRole('article').getByText('Published', { exact: true })).toBeVisible();
});

async function installAdminReviewStubs(
  page: Page,
  handleReview: (route: Route) => Promise<boolean>,
): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/customer/auth/me')) {
      await json(route, 401, { code: 'CUSTOMER_SESSION_REQUIRED', message: 'Sign in required' });
      return;
    }
    if (pathname.endsWith('/admin/auth/me')) {
      await json(route, 200, {
        admin: {
          id: 'phase17-owner',
          name: 'Rich Culture Owner',
          email: 'owner@example.com',
          roles: ['OWNER'],
        },
      });
      return;
    }
    if (pathname.endsWith('/admin/auth/csrf')) {
      await json(route, 200, { csrfToken: 'phase17-admin-csrf', expiresInSeconds: 7200 });
      return;
    }
    if (await handleReview(route)) return;
    await json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: pathname });
  });
}
