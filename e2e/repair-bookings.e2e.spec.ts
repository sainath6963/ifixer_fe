import { expect, test, type Page } from '@playwright/test';
import { installAnonymousApiStubs } from './api-stubs';
import type {
  BookingInput,
  RepairBooking,
  RepairCatalog,
} from '../src/features/repair-bookings/repair.types';

const brandId = '111111111111111111111111';
const modelId = '222222222222222222222222';
const serviceId = '333333333333333333333333';
const reference = 'IFX-1234567890ABCDEF';
const fixtureCatalog = (): RepairCatalog => ({
  brands: [
    { id: brandId, name: 'Example brand', slug: 'example', active: true, sortOrder: 0, version: 0 },
  ],
  models: [
    {
      id: modelId,
      brandId,
      name: 'Example phone',
      slug: 'phone',
      active: true,
      sortOrder: 0,
      version: 0,
    },
  ],
  services: [
    {
      id: serviceId,
      name: 'Screen repair',
      slug: 'screen',
      description: 'Inspect and replace a damaged screen.',
      pricingMode: 'DIAGNOSIS',
      active: true,
      sortOrder: 0,
      version: 0,
    },
  ],
  options: [
    {
      id: '444444444444444444444444',
      modelId,
      serviceId,
      pricingMode: 'INDICATIVE',
      priceInPaise: 249950,
      active: true,
      sortOrder: 0,
      version: 0,
    },
  ],
});
function bookingFixture(input?: BookingInput): RepairBooking {
  return {
    reference,
    customerName: input?.customerName ?? 'Test Customer',
    phone: input?.phone ?? '+919876543210',
    deviceLabel: input?.modelId
      ? 'Example brand Example phone'
      : (input?.deviceDescription ?? 'Unlisted phone'),
    serviceLabel: input?.serviceId ? 'Screen repair' : 'Other issue / diagnosis',
    issue: input?.issue ?? 'The phone display flickers after a fall.',
    pricingMode: input?.modelId ? 'INDICATIVE' : 'DIAGNOSIS',
    indicativePriceInPaise: input?.modelId ? 249950 : undefined,
    requestedVisitAt: input?.requestedVisitAt,
    status: 'REQUESTED',
    version: 0,
    createdAt: new Date().toISOString(),
    source: 'ONLINE',
    history: [
      {
        at: new Date().toISOString(),
        action: 'CREATE',
        status: 'REQUESTED',
        reason: 'Repair request submitted',
      },
    ],
  };
}
async function install(page: Page, admin = false) {
  await installAnonymousApiStubs(page);
  await page.route('**/api/v1/repair/catalog', (route) =>
    route.fulfill({ json: fixtureCatalog() }),
  );
  if (admin)
    await page.route('**/api/v1/admin/auth/me', (route) =>
      route.fulfill({
        json: {
          admin: {
            id: 'repair-staff',
            name: 'Repair Staff',
            email: 'staff@example.test',
            roles: ['STAFF'],
          },
        },
      }),
    );
}
async function fillUnknownPhone(page: Page) {
  await page.getByLabel('Describe your phone', { exact: true }).fill('Unlisted Android phone');
  await page
    .getByLabel('What’s happening with your phone?')
    .fill('The phone display flickers after a fall.');
  await page.getByLabel('Your name', { exact: true }).fill('Test Customer');
  await page.getByLabel('Phone with country code').fill('+919876543210');
}

for (const width of [360, 390, 768, 1440]) {
  test(`customer requests and privately manages a repair at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await install(page);
    let booking = bookingFixture();
    let token = '';
    await page.route('**/api/v1/repair/bookings**', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        const input = request.postDataJSON() as BookingInput;
        token = input.manageToken;
        booking = bookingFixture(input);
        await route.fulfill({ status: 201, json: { booking } });
        return;
      }
      expect(request.headers()['x-repair-token']).toBe(token);
      if (request.method() === 'PATCH') {
        const input = request.postDataJSON() as {
          action: 'RESCHEDULE' | 'CANCEL';
          reason: string;
          expectedVersion: number;
          visitAt?: string;
        };
        expect(input.expectedVersion).toBe(booking.version);
        booking = {
          ...booking,
          version: booking.version + 1,
          status: input.action === 'CANCEL' ? 'CANCELLED' : 'REQUESTED',
          requestedVisitAt: input.visitAt ?? booking.requestedVisitAt,
          history: [
            ...booking.history,
            {
              at: new Date().toISOString(),
              action: input.action,
              status: input.action === 'CANCEL' ? 'CANCELLED' : 'REQUESTED',
              reason: input.reason,
            },
          ],
        };
      }
      await route.fulfill({ json: { booking } });
    });
    await page.goto('/book-repair');
    await page.getByRole('combobox', { name: 'Brand', exact: true }).selectOption(brandId);
    await page.getByRole('combobox', { name: 'Model', exact: true }).selectOption(modelId);
    await page
      .getByRole('combobox', { name: 'Repair service', exact: true })
      .selectOption(serviceId);
    await expect(page.getByText(/Indicative estimate: ₹2,499.5/)).toBeVisible();
    await page
      .getByLabel('What’s happening with your phone?')
      .fill('The phone display flickers after a fall.');
    await page.getByLabel('Your name', { exact: true }).fill('Test Customer');
    await page.getByLabel('Phone with country code').fill('+919876543210');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`booking-form-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Request a repair', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Your next step is on its way.' }),
    ).toBeVisible();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    await expect(page.getByText(/The shop still needs to confirm/)).toBeVisible();
    await page.getByRole('link', { name: 'View booking' }).click();
    await expect(page.getByRole('heading', { name: 'Booking details' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    expect(page.url()).not.toContain(token);
    await page.getByLabel('New visit time (IST)').fill('2027-01-15T14:00');
    await page.getByLabel('Reason (visible to customer)').fill('Please arrange a later visit');
    await page.getByRole('button', { name: 'Save visit update' }).click();
    await expect(page.getByText('Booking updated.')).toBeVisible();
    expect(booking.requestedVisitAt).toBe('2027-01-15T08:30:00.000Z');
    await page.getByRole('combobox', { name: 'Action', exact: true }).selectOption('CANCEL');
    await page.getByLabel('Reason (visible to customer)').fill('I no longer need this repair');
    await page.getByRole('button', { name: 'Cancel this booking' }).click();
    await expect(page.getByText('CANCELLED', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Change your request' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath(`booking-details-${width}.png`),
      fullPage: true,
    });
  });

  test(`admin booking queue and catalog fit ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await install(page, true);
    await page.route('**/api/v1/admin/repair/catalog', (route) =>
      route.fulfill({ json: fixtureCatalog() }),
    );
    await page.route('**/api/v1/admin/repair/bookings?**', (route) =>
      route.fulfill({
        json: { items: [bookingFixture()], total: 1, totalPages: 1, page: 1, limit: 20 },
      }),
    );
    await page.goto('/admin/repair/bookings');
    await expect(page.getByRole('link', { name: /Open IFX-/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`booking-queue-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Add walk-in', exact: true }).click();
    await fillUnknownPhone(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`walk-in-${width}.png`), fullPage: true });
    await page.goto('/admin/repair/services');
    await expect(page.getByRole('button', { name: 'Save entry' })).toBeVisible();
    await page.getByRole('button', { name: 'Model compatibility', exact: true }).click();
    await page.getByRole('combobox', { name: 'Device model', exact: true }).selectOption(modelId);
    await page
      .getByRole('combobox', { name: 'Repair service', exact: true })
      .selectOption(serviceId);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`repair-catalog-${width}.png`), fullPage: true });
  });
}

test('an uncertain submission survives reload and retries with the same operation and access credentials', async ({
  page,
}) => {
  await install(page);
  const inputs: BookingInput[] = [];
  await page.route('**/api/v1/repair/bookings', async (route) => {
    inputs.push(route.request().postDataJSON() as BookingInput);
    if (inputs.length === 1) await route.abort('failed');
    else await route.fulfill({ status: 201, json: { booking: bookingFixture(inputs[0]) } });
  });
  await page.goto('/book-repair');
  await fillUnknownPhone(page);
  await page.getByRole('button', { name: 'Request a repair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry this request' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Your name', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Retry this request' }).click();
  await expect(page.getByRole('heading', { name: 'Your next step is on its way.' })).toBeVisible();
  expect(inputs).toHaveLength(2);
  expect(inputs[0]).toEqual(inputs[1]);
});

test('staff saves and archives an indicative service using integer paise and its loaded version', async ({
  page,
}) => {
  await install(page, true);
  const catalog = fixtureCatalog();
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/api/v1/admin/repair/catalog', (route) => route.fulfill({ json: catalog }));
  await page.route('**/api/v1/admin/repair/catalog/services**', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    bodies.push(body);
    const entry = {
      id: '555555555555555555555555',
      name: String(body.name),
      slug: String(body.slug),
      description: String(body.description),
      active: Boolean(body.active),
      sortOrder: 0,
      version: bodies.length - 1,
      pricingMode: 'INDICATIVE' as const,
      priceInPaise: Number(body.priceInPaise),
    };
    catalog.services = [entry];
    await route.fulfill({ json: { entry } });
  });
  await page.goto('/admin/repair/services');
  await page.getByRole('button', { name: 'Services', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Battery replacement');
  await page.getByLabel('Description', { exact: true }).fill('Assess and replace a worn battery.');
  await page.getByRole('combobox', { name: 'Pricing', exact: true }).selectOption('INDICATIVE');
  await page.getByLabel('Indicative amount (₹)', { exact: true }).fill('1299.50');
  await page.getByLabel('Active and available for selection').check();
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.getByText('Catalog saved.')).toBeVisible();
  expect(bodies[0]).toMatchObject({
    name: 'Battery replacement',
    slug: 'battery-replacement',
    priceInPaise: 129950,
    active: true,
  });
  await page.getByRole('button', { name: 'Edit Battery replacement' }).click();
  await page.getByLabel('Active and available for selection').uncheck();
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.getByText('Archived / inactive', { exact: false })).toBeVisible();
  expect(bodies[1]).toMatchObject({ expectedVersion: 0, active: false, priceInPaise: 129950 });
});

test('staff confirms an appointment and records a walk-in through the booking screens', async ({
  page,
}) => {
  await install(page, true);
  let booking = bookingFixture();
  let walkIn: BookingInput | undefined;
  await page.route('**/api/v1/admin/repair/bookings**', async (route) => {
    if (route.request().method() === 'POST') {
      walkIn = route.request().postDataJSON() as BookingInput;
      await route.fulfill({
        status: 201,
        json: { booking: { ...bookingFixture(walkIn), source: 'WALK_IN' } },
      });
      return;
    }
    if (route.request().method() === 'PATCH') {
      const input = route.request().postDataJSON() as {
        action: string;
        expectedVersion: number;
        visitAt: string;
        reason: string;
      };
      expect(input).toMatchObject({ action: 'CONFIRM', expectedVersion: 0 });
      booking = {
        ...booking,
        status: 'CONFIRMED',
        version: 1,
        confirmedVisitAt: input.visitAt,
        history: [
          ...booking.history,
          {
            at: new Date().toISOString(),
            action: 'CONFIRM',
            status: 'CONFIRMED',
            reason: input.reason,
          },
        ],
      };
    }
    await route.fulfill({
      json: route.request().url().includes(reference)
        ? { booking }
        : { items: [booking], total: 1, totalPages: 1, page: 1, limit: 20 },
    });
  });
  await page.goto('/admin/repair/bookings');
  await page.getByRole('link', { name: /Open IFX-/ }).click();
  await page.getByLabel('New visit time (IST)').fill('2027-01-16T12:00');
  await page.getByLabel('Reason (visible to customer)').fill('Visit time agreed by phone');
  await page.getByRole('button', { name: 'Save visit update' }).click();
  await expect(page.getByText('CONFIRMED', { exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Back to bookings' }).click();
  await page.getByRole('button', { name: 'Add walk-in' }).click();
  await fillUnknownPhone(page);
  await page.getByRole('button', { name: 'Record walk-in request' }).click();
  await expect(page.getByRole('heading', { name: 'Your next step is on its way.' })).toBeVisible();
  expect(walkIn).toMatchObject({
    deviceDescription: 'Unlisted Android phone',
    phone: '+919876543210',
  });
});

test('server validation explains the problem and leaves the booking editable', async ({ page }) => {
  await install(page);
  let calls = 0;
  await page.route('**/api/v1/repair/bookings', async (route) => {
    calls++;
    if (calls === 1)
      await route.fulfill({ status: 400, json: { message: ['Choose a future visit time'] } });
    else
      await route.fulfill({
        status: 201,
        json: { booking: bookingFixture(route.request().postDataJSON() as BookingInput) },
      });
  });
  await page.goto('/book-repair');
  await fillUnknownPhone(page);
  await page.getByRole('button', { name: 'Request a repair', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Choose a future visit time');
  await expect(page.getByLabel('Your name', { exact: true })).toBeEnabled();
  await page.getByLabel('Preferred visit (optional, India time)').fill('2027-01-15T12:00');
  await page.getByRole('button', { name: 'Request a repair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next step is on its way.' })).toBeVisible();
});
