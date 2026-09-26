import { expect, test, type Page, type Route } from '@playwright/test';

const orderNumber = 'RC-20260810-A1B2C3D4E5';
const originalVariantId = '66b800000000000000000001';
const exchangeVariantId = '66b800000000000000000002';

const order = {
  id: '66b800000000000000000010',
  orderNumber,
  customer: { name: 'Asha Kulkarni', email: 'asha@example.com' },
  shippingAddress: {
    fullName: 'Asha Kulkarni',
    phone: '+919876543210',
    line1: '12 Culture Lane',
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: '411001',
    countryCode: 'IN',
  },
  items: [
    {
      productId: '66b800000000000000000003',
      variantId: originalVariantId,
      productName: 'Culture Linen Shirt',
      productSlug: 'culture-linen-shirt',
      sku: 'RC-LINEN-M',
      variantTitle: 'Natural / M',
      attributes: [{ name: 'size', value: 'M' }],
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
  lifecycleStatus: 'COMPLETED',
  financialStatus: 'PAID',
  fulfillmentStatus: 'DELIVERED',
  shipping: {
    provider: 'MANUAL',
    status: 'DELIVERED',
    courierName: 'Fixture Courier',
    trackingNumber: 'RETURN-E2E-TRACKING',
    trackingEvents: [
      {
        status: 'DELIVERED',
        message: 'Fixture shipment delivered',
        occurredAt: '2026-08-09T10:00:00.000Z',
      },
    ],
    lastEventAt: '2026-08-09T10:00:00.000Z',
    shippedAt: '2026-08-08T12:00:00.000Z',
    deliveredAt: '2026-08-09T10:00:00.000Z',
  },
  paymentExpiresAt: '2026-08-01T10:00:00.000Z',
  paymentReady: false,
  statusHistory: [],
  createdAt: '2026-08-08T10:00:00.000Z',
  updatedAt: '2026-08-09T10:00:00.000Z',
};

async function json(route: Route, status: number, body: object): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installReturnStubs(page: Page): Promise<() => unknown> {
  let submittedBody: unknown;
  let requests: object[] = [];
  let evidence: object[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const apiRequest = route.request();
    const pathname = new URL(apiRequest.url()).pathname;
    if (pathname.endsWith('/customer/auth/me')) {
      await json(route, 200, {
        customer: {
          id: 'customer-e2e',
          name: 'Asha Kulkarni',
          email: 'asha@example.com',
          emailVerified: true,
        },
      });
      return;
    }
    if (pathname.endsWith('/customer/auth/csrf')) {
      await json(route, 200, { csrfToken: 'e2e-csrf-token', expiresInSeconds: 7200 });
      return;
    }
    if (pathname.endsWith('/cart')) {
      await json(route, 200, {
        cart: {
          id: 'e2e-cart',
          version: 0,
          items: [],
          totalQuantity: 0,
          subtotalInPaise: 0,
          readyForCheckout: false,
        },
      });
      return;
    }
    if (
      pathname.endsWith(`/customer/orders/${orderNumber}/returns/RT-20260810-ABCDEF123456/evidence`)
    ) {
      if (apiRequest.method() === 'POST') {
        evidence = [
          {
            id: '66b800000000000000000030',
            originalFilename: 'wrong-item.png',
            mimeType: 'image/webp',
            sizeBytes: 512,
            width: 80,
            height: 60,
            contentUrl: `/api/v1/customer/orders/${orderNumber}/returns/RT-20260810-ABCDEF123456/evidence/66b800000000000000000030/content`,
            createdAt: '2026-08-10T08:10:00.000Z',
          },
        ];
        requests = requests.map((item) => ({
          ...item,
          status: 'APPROVED',
          exchangeReservation: {
            status: 'ACTIVE',
            expiresAt: '2026-08-24T08:00:00.000Z',
          },
        }));
        await json(route, 201, { evidence: evidence[0] });
        return;
      }
      await json(route, 200, { evidence });
      return;
    }
    if (pathname.endsWith('/evidence/66b800000000000000000030/content')) {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
      });
      return;
    }
    if (pathname.endsWith(`/customer/orders/${orderNumber}/returns`)) {
      if (apiRequest.method() === 'POST') {
        submittedBody = apiRequest.postDataJSON();
        requests = [
          {
            id: '66b800000000000000000020',
            returnNumber: 'RT-20260810-ABCDEF123456',
            orderNumber,
            type: 'EXCHANGE',
            status: 'REQUESTED',
            items: [
              {
                ...order.items[0],
                quantity: 1,
                reason: 'SIZE_ISSUE',
                requestedExchangeVariant: {
                  variantId: exchangeVariantId,
                  sku: 'RC-LINEN-L',
                  title: 'Natural / L',
                  attributes: [{ name: 'size', value: 'L' }],
                  currentlyAvailable: true,
                },
                estimatedValueInPaise: 149_900,
                restockedQuantity: 0,
              },
            ],
            estimatedTotalInPaise: 149_900,
            requestedAt: '2026-08-10T08:00:00.000Z',
            statusHistory: [{ status: 'REQUESTED', occurredAt: '2026-08-10T08:00:00.000Z' }],
            version: 0,
            createdAt: '2026-08-10T08:00:00.000Z',
            updatedAt: '2026-08-10T08:00:00.000Z',
          },
        ];
        await json(route, 201, requests[0]);
        return;
      }
      await json(route, 200, {
        eligibility: {
          eligible: requests.length === 0,
          reason: requests.length ? 'All eligible quantities are already requested.' : undefined,
          deliveredAt: '2026-08-09T10:00:00.000Z',
          deadline: '2026-08-16T10:00:00.000Z',
          windowDays: 7,
          items: [
            {
              productId: order.items[0].productId,
              variantId: originalVariantId,
              productName: order.items[0].productName,
              sku: order.items[0].sku,
              variantTitle: order.items[0].variantTitle,
              orderedQuantity: 1,
              allocatedQuantity: requests.length,
              availableQuantity: requests.length ? 0 : 1,
              exchangeOptions: [
                {
                  variantId: exchangeVariantId,
                  sku: 'RC-LINEN-L',
                  title: 'Natural / L',
                  attributes: [{ name: 'size', value: 'L' }],
                  currentlyAvailable: true,
                },
              ],
            },
          ],
        },
        requests,
      });
      return;
    }
    if (pathname.endsWith(`/customer/orders/${orderNumber}`)) {
      await json(route, 200, { order });
      return;
    }
    await json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: pathname });
  });
  return () => submittedBody;
}

test('customer submits and tracks an item-level exchange', async ({ page }) => {
  const submittedBody = await installReturnStubs(page);
  await page.goto(`/orders/${orderNumber}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Thank you.' })).toBeVisible();
  await page.getByRole('button', { name: 'Start a request' }).click();
  await page.getByLabel('Exchange variant').check();
  await page.getByLabel('Quantity').selectOption('1');
  await page.getByLabel('Replacement').selectOption(exchangeVariantId);
  await page.getByRole('button', { name: 'Submit request' }).click();

  await expect(page.getByRole('status')).toContainText(
    'RT-20260810-ABCDEF123456 was submitted for review.',
  );
  await expect(page.getByRole('heading', { level: 3, name: 'Exchange' })).toBeVisible();
  await expect(page.getByText('REQUESTED', { exact: true })).toBeVisible();
  await expect(page.getByText('No evidence photos attached.')).toBeVisible();
  await page.getByLabel(/Add JPEG, PNG, WebP or AVIF/).setInputFiles({
    name: 'wrong-item.png',
    mimeType: 'image/png',
    buffer: Buffer.from('e2e-image-fixture'),
  });
  await page.getByRole('button', { name: 'Upload photo' }).click();
  await expect(page.getByRole('img', { name: 'wrong-item.png' })).toBeVisible();
  await expect(page.getByText('1 / 5 photos')).toBeVisible();
  await expect(page.getByText(/Replacement reserved until 24 Aug 2026/)).toBeVisible();
  expect(submittedBody()).toMatchObject({
    type: 'EXCHANGE',
    items: [
      {
        variantId: originalVariantId,
        quantity: 1,
        reason: 'SIZE_ISSUE',
        requestedExchangeVariantId: exchangeVariantId,
      },
    ],
  });
});
