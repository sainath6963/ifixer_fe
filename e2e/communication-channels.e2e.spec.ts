import { expect, test, type Route } from '@playwright/test';

async function json(route: Route, status: number, body: object): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test('verified customer explicitly opts into SMS and WhatsApp order updates', async ({ page }) => {
  let preferencesRequest: Record<string, unknown> | undefined;
  const customer = {
    id: 'phase22-customer',
    name: 'Asha Kulkarni',
    email: 'asha@example.com',
    mobile: '+919876543210',
    mobileVerified: true,
    emailVerified: true,
    version: 3,
    communicationPreferences: {
      marketingEmail: false,
      backInStockEmail: true,
      orderUpdatesSms: false,
      orderUpdatesWhatsapp: false,
    },
  };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/customer/auth/me')) return json(route, 200, { customer });
    if (pathname.endsWith('/customer/auth/csrf')) {
      return json(route, 200, { csrfToken: 'phase22-csrf', expiresInSeconds: 7200 });
    }
    if (pathname.endsWith('/customer/profile/preferences') && request.method() === 'PATCH') {
      preferencesRequest = request.postDataJSON() as Record<string, unknown>;
      Object.assign(customer.communicationPreferences, {
        orderUpdatesSms: preferencesRequest.orderUpdatesSms,
        orderUpdatesWhatsapp: preferencesRequest.orderUpdatesWhatsapp,
      });
      customer.version += 1;
      return json(route, 200, { customer });
    }
    if (pathname.endsWith('/customer/addresses')) {
      return json(route, 200, { version: 0, limit: 10, addresses: [] });
    }
    return json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: pathname });
  });

  await page.goto('/account');
  const preferences = page.locator('.account-card--preferences');
  await preferences.getByRole('checkbox', { name: /Order updates by SMS/ }).check();
  await preferences.getByRole('checkbox', { name: /Order updates on WhatsApp/ }).check();
  await preferences.getByRole('button', { name: 'Save preferences' }).click();

  await expect
    .poll(() => preferencesRequest)
    .toMatchObject({
      orderUpdatesSms: true,
      orderUpdatesWhatsapp: true,
      expectedVersion: 3,
    });
  await expect(preferences.getByRole('status')).toContainText('Communication preferences saved.');
});

test('admin filters delivery operations by mobile channel', async ({ page }) => {
  let requestedChannel: string | null = null;
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/admin/auth/me')) {
      return json(route, 200, {
        admin: {
          id: 'phase22-owner',
          name: 'Communication Owner',
          email: 'owner@richculture.test',
          roles: ['OWNER'],
        },
      });
    }
    if (url.pathname.endsWith('/admin/auth/csrf')) {
      return json(route, 200, { csrfToken: 'phase22-admin-csrf', expiresInSeconds: 7200 });
    }
    if (url.pathname.endsWith('/admin/notifications/operations-summary')) {
      return json(route, 200, {
        outbox: { PENDING: 0, PROCESSING: 0, PUBLISHED: 1, FAILED: 0, DEAD: 0 },
        notifications: { PENDING: 0, PROCESSING: 0, SENT: 1, FAILED: 0, DEAD: 0 },
      });
    }
    if (url.pathname.endsWith('/admin/notifications')) {
      requestedChannel = url.searchParams.get('channel');
      return json(route, 200, {
        items: [
          {
            id: 'phase22-delivery',
            sourceEventId: 'phase22-order-shipped',
            templateKey: 'ORDER_FULFILLMENT_SHIPPED',
            channel: 'SMS',
            recipient: '+919876543210',
            status: 'SENT',
            attempts: 1,
            nextAttemptAt: '2026-08-20T10:00:00.000Z',
            sentAt: '2026-08-20T10:00:01.000Z',
            createdAt: '2026-08-20T10:00:00.000Z',
            updatedAt: '2026-08-20T10:00:01.000Z',
          },
        ],
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1,
      });
    }
    return json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: url.pathname });
  });

  await page.goto('/admin/notifications');
  await expect(page.getByRole('heading', { level: 1, name: 'Events & messaging' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'SMS' })).toBeVisible();
  await page.getByLabel('Channel').selectOption('SMS');

  await expect(page).toHaveURL(/channel=SMS/);
  await expect.poll(() => requestedChannel).toBe('SMS');
});
