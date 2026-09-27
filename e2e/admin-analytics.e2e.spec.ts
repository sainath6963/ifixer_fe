import { expect, test, type Page, type Route } from '@playwright/test';

async function json(route: Route, status: number, body: object): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installAnalyticsStubs(page: Page): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/admin/auth/me')) {
      await json(route, 200, {
        admin: {
          id: 'phase20-owner',
          name: 'Analytics Owner',
          email: 'analytics-owner@richculture.test',
          roles: ['OWNER'],
        },
      });
      return;
    }
    if (url.pathname.endsWith('/admin/auth/csrf')) {
      await json(route, 200, { csrfToken: 'phase20-admin-csrf', expiresInSeconds: 7200 });
      return;
    }
    if (url.pathname.endsWith('/admin/analytics/export.csv')) {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv; charset=utf-8',
        headers: {
          'Content-Disposition':
            'attachment; filename="ifixer-analytics-2026-08-01-to-2026-08-07.csv"',
        },
        body: 'Period,Gross sales (INR)\r\n2026-08-01,1000.00\r\n',
      });
      return;
    }
    if (url.pathname.endsWith('/admin/analytics')) {
      const dateFrom = url.searchParams.get('dateFrom') ?? '2026-08-01';
      const dateTo = url.searchParams.get('dateTo') ?? '2026-08-07';
      await json(route, 200, {
        period: {
          dateFrom,
          dateTo,
          timezone: 'Asia/Kolkata',
          days: 7,
          granularity: 'DAY',
        },
        kpis: {
          grossSalesInPaise: { value: 150000, previousValue: 100000, changePercent: 50 },
          refundsInPaise: { value: 10000, previousValue: 0, changePercent: null },
          netRevenueInPaise: { value: 140000, previousValue: 100000, changePercent: 40 },
          paidOrders: { value: 3, previousValue: 2, changePercent: 50 },
          averageOrderValueInPaise: { value: 50000, previousValue: 50000, changePercent: 0 },
          newCustomers: { value: 2, previousValue: 1, changePercent: 100 },
        },
        trend: [
          {
            key: dateFrom,
            grossSalesInPaise: 100000,
            refundsInPaise: 10000,
            netRevenueInPaise: 90000,
            orders: 2,
            newCustomers: 1,
          },
          {
            key: dateTo,
            grossSalesInPaise: 50000,
            refundsInPaise: 0,
            netRevenueInPaise: 50000,
            orders: 1,
            newCustomers: 1,
          },
        ],
        topProducts: [
          {
            productId: 'phase20-product',
            name: 'Rich Culture Signature Tee',
            slug: 'signature-tee',
            unitsSold: 3,
            itemSalesInPaise: 150000,
          },
        ],
        lowStock: [
          {
            productId: 'phase20-product',
            productName: 'Rich Culture Signature Tee',
            variantId: 'phase20-variant',
            variantTitle: 'Black / M',
            sku: 'RC-SIG-BLK-M',
            available: 2,
            reorderPoint: 5,
          },
        ],
        generatedAt: '2026-08-20T10:00:00.000Z',
      });
      return;
    }
    await json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: url.pathname });
  });
}

test('admin reviews date-owned analytics and downloads CSV', async ({ page }) => {
  await installAnalyticsStubs(page);
  await page.goto('/admin/analytics?dateFrom=2026-08-01&dateTo=2026-08-07');

  await expect(page.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();
  await expect(page.getByText('Gross captured').locator('..').getByText('₹1,500')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Revenue trend' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Rich Culture Signature Tee' }).first(),
  ).toBeVisible();
  await expect(page.getByText('RC-SIG-BLK-M')).toBeVisible();

  await page.getByRole('button', { name: '7 days' }).click();
  await expect(page).toHaveURL(/dateFrom=\d{4}-\d{2}-\d{2}&dateTo=\d{4}-\d{2}-\d{2}/);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/^ifixer-analytics-/);
});
