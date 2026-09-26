import { expect, test, type Page, type Route } from '@playwright/test';

const customer = {
  id: 'customer-e2e',
  name: 'Asha Kulkarni',
  email: 'asha@example.com',
  mobile: '+919876543210',
  mobileVerified: true,
  emailVerified: true,
  version: 0,
  communicationPreferences: {
    marketingEmail: false,
    backInStockEmail: true,
    orderUpdatesSms: false,
    orderUpdatesWhatsapp: false,
  },
};

const savedAddress = {
  id: 'address-e2e',
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

const checkoutCart = {
  cart: {
    id: 'cart-e2e',
    version: 3,
    items: [
      {
        productId: 'product-e2e',
        variantId: 'variant-e2e',
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
  },
};

async function json(route: Route, status: number, body: object): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installAuthenticatedApiStubs(page: Page): Promise<() => number> {
  let addressBook = { version: 0, limit: 10, addresses: [] as Array<typeof savedAddress> };
  let createRequests = 0;

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.endsWith('/customer/auth/me')) {
      await json(route, 200, { customer });
      return;
    }

    if (pathname.endsWith('/customer/auth/csrf')) {
      await json(route, 200, { csrfToken: 'e2e-csrf-token', expiresInSeconds: 7200 });
      return;
    }

    if (pathname.endsWith('/customer/addresses')) {
      if (request.method() === 'POST') {
        createRequests += 1;
        addressBook = { version: 1, limit: 10, addresses: [savedAddress] };
      }
      await json(route, 200, addressBook);
      return;
    }

    if (pathname.endsWith('/cart')) {
      await json(route, 200, checkoutCart);
      return;
    }

    await json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: pathname });
  });

  return () => createRequests;
}

test('customer saves a default address and checkout reuses it', async ({ page }) => {
  const createRequestCount = await installAuthenticatedApiStubs(page);

  await page.goto('/account');
  await expect(page.getByRole('heading', { level: 1, name: 'Hello, Asha.' })).toBeVisible();
  await expect(page.getByText('No saved addresses yet.')).toBeVisible();

  const addressBook = page.locator('.account-card--addresses');
  await addressBook.getByRole('button', { name: 'Add address' }).click();
  await addressBook.getByLabel('Label').fill(savedAddress.label);
  await addressBook.getByLabel('Full name').fill(savedAddress.fullName);
  await addressBook.getByLabel('Mobile number').fill(savedAddress.phone);
  await addressBook.getByLabel('Address line 1').fill(savedAddress.line1);
  await addressBook.getByLabel('City').fill(savedAddress.city);
  await addressBook.getByLabel('State').fill(savedAddress.state);
  await addressBook.getByLabel('PIN code').fill(savedAddress.postalCode);
  await addressBook.getByLabel('Use as my default delivery address').check();
  await addressBook.getByRole('button', { name: 'Save address' }).click();

  await expect.poll(createRequestCount).toBe(1);
  const address = page.locator('.address-book__item');
  await expect(address.getByText('Home', { exact: true })).toBeVisible();
  await expect(address.getByText('Default', { exact: true })).toBeVisible();
  await expect(address).toContainText('12 Culture Lane');
  await expect(address).toContainText('Pune, Maharashtra 411001');

  await page.goto('/checkout');
  await expect(page.getByLabel('Saved delivery address')).toHaveValue(savedAddress.id);
  await expect(page.getByLabel('Full name')).toHaveValue(savedAddress.fullName);
  await expect(page.getByLabel('Address line 1')).toHaveValue(savedAddress.line1);
  await expect(page.getByLabel('PIN code')).toHaveValue(savedAddress.postalCode);
});
