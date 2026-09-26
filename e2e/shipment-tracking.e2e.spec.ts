import { expect, test, type Page, type Route } from '@playwright/test';

const orderNumber = 'RC-PHASE21-0001';
const readyAt = '2026-08-20T10:00:00.000Z';
const baseOrder = {
  id: 'phase21-order-id',
  orderNumber,
  customer: { name: 'Asha Kulkarni', email: 'asha@example.com', mobile: '+919876543210' },
  shippingAddress: {
    fullName: 'Asha Kulkarni',
    phone: '+919876543210',
    line1: '21 Culture Lane',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411001',
    countryCode: 'IN',
  },
  items: [
    {
      productId: 'phase21-product',
      variantId: 'phase21-variant',
      productName: 'Rich Culture Linen Shirt',
      productSlug: 'linen-shirt',
      sku: 'RC-LINEN-M',
      variantTitle: 'Natural / M',
      attributes: [{ name: 'Size', value: 'M' }],
      unitPriceInPaise: 149_900,
      discountInPaise: 0,
      taxInPaise: 0,
      quantity: 1,
      lineTotalInPaise: 149_900,
    },
  ],
  totals: {
    subtotalInPaise: 149_900,
    itemDiscountInPaise: 0,
    couponDiscountInPaise: 0,
    shippingInPaise: 0,
    taxInPaise: 0,
    grandTotalInPaise: 149_900,
  },
  currency: 'INR',
  lifecycleStatus: 'CONFIRMED',
  financialStatus: 'PAID',
  fulfillmentStatus: 'PROCESSING',
  paymentExpiresAt: '2026-08-20T09:00:00.000Z',
  paymentReady: false,
  statusHistory: [],
  refunds: [],
  version: 1,
  createdAt: '2026-08-20T09:00:00.000Z',
  updatedAt: readyAt,
};

async function json(route: Route, status: number, body: object): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installShipmentStubs(page: Page): Promise<{
  createRequests: () => number;
  eventRequests: () => number;
}> {
  let order = { ...baseOrder, shipping: undefined as object | undefined };
  let createRequests = 0;
  let eventRequests = 0;

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/admin/auth/me')) {
      await json(route, 200, {
        admin: {
          id: 'phase21-owner',
          name: 'Shipment Owner',
          email: 'phase21-owner@richculture.test',
          roles: ['OWNER'],
        },
      });
      return;
    }
    if (pathname.endsWith('/customer/auth/me')) {
      await json(route, 200, {
        customer: {
          id: 'phase21-customer',
          name: 'Asha Kulkarni',
          email: 'asha@example.com',
          mobile: '+919876543210',
          emailVerified: true,
          mobileVerified: true,
          version: 0,
          communicationPreferences: {
            marketingEmail: false,
            backInStockEmail: true,
            orderUpdatesSms: false,
            orderUpdatesWhatsapp: false,
          },
        },
      });
      return;
    }
    if (pathname.endsWith('/admin/auth/csrf') || pathname.endsWith('/customer/auth/csrf')) {
      await json(route, 200, { csrfToken: 'phase21-csrf', expiresInSeconds: 7200 });
      return;
    }
    if (pathname.endsWith(`/admin/orders/${orderNumber}/shipment`)) {
      createRequests += 1;
      const body = request.postDataJSON() as Record<string, string>;
      order = {
        ...order,
        version: 2,
        shipping: {
          provider: 'MANUAL',
          status: 'READY_TO_SHIP',
          courierName: body.courierName,
          trackingNumber: body.trackingNumber,
          trackingUrl: body.trackingUrl,
          serviceLevel: body.serviceLevel,
          estimatedDeliveryAt: body.estimatedDeliveryAt,
          trackingEvents: [
            {
              status: 'READY_TO_SHIP',
              message: 'Shipment booked and ready for courier handover',
              occurredAt: readyAt,
            },
          ],
          lastEventAt: readyAt,
        },
      };
      await json(route, 201, { order });
      return;
    }
    if (pathname.endsWith(`/admin/orders/${orderNumber}/shipment/status`)) {
      eventRequests += 1;
      const body = request.postDataJSON() as Record<string, string>;
      const eventAt = '2026-08-20T11:00:00.000Z';
      const shipping = order.shipping as Record<string, unknown> & {
        trackingEvents: object[];
      };
      order = {
        ...order,
        version: 3,
        fulfillmentStatus: 'SHIPPED',
        shipping: {
          ...shipping,
          status: body.status,
          shippedAt: eventAt,
          lastEventAt: eventAt,
          trackingEvents: [
            ...shipping.trackingEvents,
            {
              status: body.status,
              message: body.message,
              location: body.location,
              occurredAt: eventAt,
            },
          ],
        },
      };
      await json(route, 200, { order });
      return;
    }
    if (pathname.endsWith(`/admin/orders/${orderNumber}`)) {
      await json(route, 200, { order });
      return;
    }
    if (pathname.endsWith(`/customer/orders/${orderNumber}`)) {
      await json(route, 200, { order });
      return;
    }
    await json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: pathname });
  });

  return {
    createRequests: () => createRequests,
    eventRequests: () => eventRequests,
  };
}

test('admin books a shipment and customer sees its tracking timeline', async ({ page }) => {
  const requests = await installShipmentStubs(page);
  await page.goto(`/admin/orders/${orderNumber}`);

  await expect(page.getByRole('heading', { level: 2, name: 'Book manual courier' })).toBeVisible();
  await page.getByLabel('Courier name').fill('Blue Dart');
  await page.getByLabel('AWB / tracking number').fill('BD-PHASE21-0001');
  await page.getByLabel('Service level').fill('Surface');
  await page.getByLabel('Tracking URL').fill('https://example.test/track/BD-PHASE21-0001');
  await page.getByRole('button', { name: 'Create shipment' }).click();

  await expect.poll(requests.createRequests).toBe(1);
  await expect(page.getByRole('heading', { level: 2, name: 'ready to ship' })).toBeVisible();
  await expect(page.getByText('BD-PHASE21-0001')).toBeVisible();

  await page.getByLabel('Customer-safe update').fill('Parcel collected by courier');
  await page.getByLabel('Location').fill('Pune hub');
  await page.getByRole('button', { name: 'Add tracking event' }).click();

  await expect.poll(requests.eventRequests).toBe(1);
  await expect(page.getByRole('heading', { level: 2, name: 'in transit' })).toBeVisible();
  await expect(page.getByText('Parcel collected by courier')).toBeVisible();

  await page.goto(`/orders/${orderNumber}`);
  await expect(page.getByRole('heading', { level: 2, name: 'in transit' })).toBeVisible();
  await expect(page.getByText('Blue Dart · BD-PHASE21-0001')).toBeVisible();
  await expect(page.getByText('Pune hub · 20 Aug 2026')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Track with courier' })).toHaveAttribute(
    'href',
    'https://example.test/track/BD-PHASE21-0001',
  );
});
