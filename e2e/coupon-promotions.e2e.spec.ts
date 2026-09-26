import { expect, test, type Page, type Route } from '@playwright/test';

const customer = {
  id: 'phase16-customer',
  name: 'Asha Kulkarni',
  email: 'asha@example.com',
  mobile: '+919876543210',
  emailVerified: true,
};

const address = {
  id: 'phase16-address',
  label: 'Home',
  fullName: 'Asha Kulkarni',
  phone: '+919876543210',
  line1: '12 Culture Lane',
  city: 'Pune',
  state: 'Maharashtra',
  postalCode: '411001',
  countryCode: 'IN',
  isDefault: true,
};

const cart = {
  id: 'phase16-cart',
  version: 4,
  items: [
    {
      productId: 'phase16-product',
      variantId: 'phase16-variant',
      quantity: 1,
      availability: 'AVAILABLE',
      productName: 'Culture Linen Shirt',
      productSlug: 'culture-linen-shirt',
      variantTitle: 'Natural / M',
      sku: 'RC-LINEN-M',
      unitPriceInPaise: 149_900,
      lineTotalInPaise: 149_900,
    },
  ],
  distinctItemCount: 1,
  totalQuantity: 1,
  subtotalInPaise: 149_900,
  currency: 'INR',
  readyForCheckout: true,
};

async function json(route: Route, status: number, body: object): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test('customer applies a server-validated coupon during checkout review', async ({ page }) => {
  let previewCouponCode = '';
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/customer/auth/me')) {
      await json(route, 200, { customer });
      return;
    }
    if (pathname.endsWith('/customer/auth/csrf')) {
      await json(route, 200, { csrfToken: 'phase16-csrf', expiresInSeconds: 7200 });
      return;
    }
    if (pathname.endsWith('/customer/addresses')) {
      await json(route, 200, { version: 1, limit: 10, addresses: [address] });
      return;
    }
    if (pathname.endsWith('/cart')) {
      await json(route, 200, { cart });
      return;
    }
    if (pathname.endsWith('/checkout/preview')) {
      const body = request.postDataJSON() as { couponCode?: string };
      previewCouponCode = body.couponCode ?? '';
      await json(route, 200, {
        preview: {
          cart,
          shippingAddress: {
            fullName: address.fullName,
            phone: address.phone,
            line1: address.line1,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            countryCode: 'IN',
          },
          totals: {
            subtotalInPaise: 149_900,
            itemDiscountInPaise: 0,
            couponDiscountInPaise: 14_990,
            shippingInPaise: 0,
            taxInPaise: 0,
            grandTotalInPaise: 134_910,
            currency: 'INR',
          },
          coupon: {
            code: 'WELCOME10',
            name: 'Welcome offer',
            discountType: 'PERCENTAGE',
            configuredValue: 10,
            discountInPaise: 14_990,
            endsAt: '2026-08-31T18:29:59.000Z',
          },
          reservationMinutes: 15,
          readyToCreateOrder: true,
        },
      });
      return;
    }
    await json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: pathname });
  });

  await page.goto('/checkout');
  await page.getByLabel('Promotion code (optional)').fill('welcome10');
  await page.getByRole('button', { name: 'Review order' }).click();

  await expect.poll(() => previewCouponCode).toBe('WELCOME10');
  await expect(page.getByText('WELCOME10 applied — you save ₹150.')).toBeVisible();
  await expect(page.getByText('Coupon · WELCOME10')).toBeVisible();
  await expect(page.locator('.checkout-bag__total')).toContainText('₹1,349');
  await expect(page.getByRole('button', { name: 'Reserve order and continue' })).toBeEnabled();
});

test('OWNER creates a draft coupon and activates it from promotions', async ({ page }) => {
  const admin = {
    id: 'phase16-owner',
    name: 'Rich Culture Owner',
    email: 'owner@example.com',
    roles: ['OWNER'],
  };
  type CouponRow = {
    id: string;
    code: string;
    name: string;
    status: string;
    discountType: string;
    percentageOff: number;
    minimumSubtotalInPaise: number;
    usageLimit: number;
    reservedCount: number;
    redeemedCount: number;
    remainingUses: number;
    startsAt: string;
    endsAt: string;
    availability: string;
    version: number;
    createdAt: string;
    updatedAt: string;
  };
  const rows: CouponRow[] = [];
  let createRequests = 0;
  let editRequests = 0;
  let activateRequests = 0;
  await installAdminStubs(
    page,
    async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (pathname.endsWith('/admin/coupons') && request.method() === 'GET') {
        await json(route, 200, {
          items: rows,
          page: 1,
          limit: 25,
          total: rows.length,
          totalPages: rows.length ? 1 : 0,
        });
        return true;
      }
      if (pathname.endsWith('/admin/coupons') && request.method() === 'POST') {
        createRequests += 1;
        const input = request.postDataJSON() as { code: string; name: string };
        const now = new Date().toISOString();
        const coupon: CouponRow = {
          id: 'phase16-coupon',
          code: input.code,
          name: input.name,
          status: 'DRAFT',
          discountType: 'PERCENTAGE',
          percentageOff: 10,
          minimumSubtotalInPaise: 100_000,
          usageLimit: 100,
          reservedCount: 0,
          redeemedCount: 0,
          remainingUses: 100,
          startsAt: now,
          endsAt: '2026-09-30T18:29:59.000Z',
          availability: 'DRAFT',
          version: 0,
          createdAt: now,
          updatedAt: now,
        };
        rows.push(coupon);
        await json(route, 201, { coupon });
        return true;
      }
      if (pathname.endsWith('/admin/coupons/phase16-coupon') && request.method() === 'PATCH') {
        const input = request.postDataJSON() as { name?: string; status?: string };
        if (input.name) {
          editRequests += 1;
          rows[0] = { ...rows[0], name: input.name, version: rows[0].version + 1 };
        } else {
          activateRequests += 1;
          rows[0] = {
            ...rows[0],
            status: 'ACTIVE',
            availability: 'LIVE',
            version: rows[0].version + 1,
          };
        }
        await json(route, 200, { coupon: rows[0] });
        return true;
      }
      return false;
    },
    admin,
  );

  await page.goto('/admin/promotions');
  await expect(page.getByRole('heading', { level: 1, name: 'Promotions' })).toBeVisible();
  await page.getByRole('button', { name: 'New coupon' }).click();
  await page.getByLabel('Coupon code').fill('welcome10');
  await page.getByLabel('Campaign name').fill('Welcome campaign');
  await page.getByLabel('Discount %').fill('10');
  await page.getByLabel('Minimum subtotal ₹').fill('1000');
  await page.getByRole('button', { name: 'Save draft coupon' }).click();

  await expect.poll(() => createRequests).toBe(1);
  await expect(page.getByText('WELCOME10 was saved as a draft.')).toBeVisible();
  await expect(page.getByRole('cell', { name: /WELCOME10/ })).toBeVisible();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Campaign name').last().fill('Updated welcome campaign');
  await page.getByRole('button', { name: 'Save campaign changes' }).click();
  await expect.poll(() => editRequests).toBe(1);
  await expect(page.getByText('WELCOME10 campaign details were updated.')).toBeVisible();
  await page.getByRole('button', { name: 'Activate' }).click();
  await expect.poll(() => activateRequests).toBe(1);
  await expect(page.getByText('WELCOME10 is now active.')).toBeVisible();
  await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
});

async function installAdminStubs(
  page: Page,
  handleCoupon: (route: Route) => Promise<boolean>,
  admin: object,
): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/admin/auth/me')) {
      await json(route, 200, { admin });
      return;
    }
    if (pathname.endsWith('/admin/auth/csrf')) {
      await json(route, 200, { csrfToken: 'phase16-admin-csrf', expiresInSeconds: 7200 });
      return;
    }
    if (await handleCoupon(route)) return;
    await json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: pathname });
  });
}
