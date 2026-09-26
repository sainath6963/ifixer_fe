import { expect, test, type Page } from '@playwright/test';
import { installAnonymousApiStubs } from './api-stubs';
import type { JobIntake, RepairJob } from '../src/features/repair-jobs/job.types';

test('confirmed intake navigates even when browser session storage is blocked', async ({
  page,
}) => {
  await page.addInitScript(() => {
    for (const key of ['getItem', 'setItem', 'removeItem'])
      Object.defineProperty(Storage.prototype, key, {
        value() {
          throw new DOMException('Storage is disabled', 'SecurityError');
        },
      });
  });
  await install(page);
  const job = fixture();
  let creates = 0;
  await page.route('**/api/v1/admin/repair/jobs**', (route) => {
    if (route.request().method() === 'POST') creates += 1;
    return route.fulfill({ json: job });
  });
  await page.goto('/admin/repair/jobs/new');
  await page.getByLabel('Customer name', { exact: true }).fill(job.customerName);
  await page.getByLabel('Phone', { exact: true }).fill('+919876543210');
  await page.getByLabel('Device / model').fill(job.deviceLabel);
  await page.getByLabel('Reported issue').fill(job.issue);
  await page.getByLabel('Received condition').fill(job.condition);
  await page.getByLabel('Accessories received').fill('None');
  await page.getByRole('button', { name: 'Receive device & create job' }).click();
  await expect(page).toHaveURL(new RegExp(`${number}$`));
  await expect(page.getByRole('heading', { name: job.deviceLabel, exact: true })).toBeVisible();
  expect(creates).toBe(1);
});
const number = 'JOB-1234567890ABCDEF';
function fixture(): RepairJob {
  return {
    number,
    version: 0,
    customerName: 'Repair Customer',
    phone: '+919876543210',
    deviceLabel: 'Example phone',
    issue: 'Display flickers after a fall.',
    condition: 'Cracked display, powers on.',
    accessories: 'Blue case, no SIM',
    status: 'DIAGNOSING',
    custody: 'IN_SHOP',
    createdAt: new Date().toISOString(),
    diagnosis: 'Display module damaged; replacement needed.',
    estimates: [],
    tests: [],
    history: [
      {
        at: new Date().toISOString(),
        actorName: 'Owner',
        action: 'INTAKE',
        status: 'RECEIVED',
        reason: 'Device received',
      },
    ],
    photos: [],
    permissions: { manage: true, repair: true },
  };
}
async function install(page: Page, role = 'OWNER') {
  await installAnonymousApiStubs(page);
  await page.route('**/api/v1/admin/auth/me', (route) =>
    route.fulfill({
      json: {
        admin: {
          id: 'job-owner',
          name: 'Workshop user',
          email: 'owner@example.test',
          roles: [role],
        },
      },
    }),
  );
  await page.route('**/api/v1/admin/repair/team', (route) =>
    route.fulfill({
      json: [
        {
          id: '111111111111111111111111',
          name: 'Example technician',
          roles: ['TECHNICIAN'],
          status: 'ACTIVE',
          version: 0,
        },
      ],
    }),
  );
}
for (const width of [360, 390, 768, 1440]) {
  test(`job queue, intake, work, estimates and print at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await install(page);
    const job = fixture();
    await page.route('**/api/v1/admin/repair/jobs**', (route) =>
      route.fulfill({
        json: new URL(route.request().url()).pathname.endsWith(number)
          ? job
          : { items: [job], total: 1, page: 1, totalPages: 1 },
      }),
    );
    await page.goto('/admin/repair/jobs');
    await expect(page.getByRole('heading', { name: 'Repair jobs', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`jobs-${width}.png`), fullPage: true });
    await page.getByRole('link', { name: 'Receive a device', exact: true }).click();
    await expect(page.getByLabel('Received condition')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`intake-${width}.png`), fullPage: true });
    await page.goto(`/admin/repair/jobs/${number}`);
    await expect(page.getByRole('heading', { name: 'Example phone', exact: true })).toBeVisible();
    for (const name of [
      'Work & status',
      'Estimates & approval',
      'Private photos',
      'History & notes',
    ]) {
      await page.getByRole('button', { name, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: info.outputPath(`${name.split(' ')[0]}-${width}.png`),
        fullPage: true,
      });
    }
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('heading', { name: 'Device intake / job receipt' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Internal note' })).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Admin navigation' })).toBeHidden();
    await page.screenshot({ path: info.outputPath(`receipt-${width}.png`), fullPage: true });
  });
}
test('uncertain direct intake survives reload and reuses the exact operation', async ({ page }) => {
  await install(page);
  const calls: JobIntake[] = [];
  const job = fixture();
  job.status = 'RECEIVED';
  await page.route('**/api/v1/admin/repair/jobs**', async (route) => {
    if (route.request().method() === 'POST') {
      calls.push(route.request().postDataJSON() as JobIntake);
      if (calls.length === 1) {
        await route.abort('failed');
        return;
      }
    }
    await route.fulfill({ json: job });
  });
  await page.goto('/admin/repair/jobs/new');
  await page.getByLabel('Customer name', { exact: true }).fill('Repair Customer');
  await page.getByLabel('Phone', { exact: true }).fill('+919876543210');
  await page.getByLabel('Device / model').fill('Example phone');
  await page.getByLabel('Reported issue').fill(job.issue);
  await page.getByLabel('Received condition').fill(job.condition);
  await page.getByLabel('Accessories received').fill('None');
  await page.getByRole('button', { name: 'Receive device & create job' }).click();
  await expect(page.getByRole('button', { name: 'Retry this intake' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Customer name')).toBeDisabled();
  await page.getByRole('button', { name: 'Retry this intake' }).click();
  await expect(page).toHaveURL(new RegExp(`${number}$`));
  expect(calls).toHaveLength(2);
  expect(calls[1]).toEqual(calls[0]);
});
test('technician and reception routes expose only their permitted work', async ({ page }) => {
  await install(page, 'TECHNICIAN');
  const job = fixture();
  job.permissions = { manage: false, repair: true };
  delete job.phone;
  await page.route('**/api/v1/admin/repair/jobs**', (route) =>
    route.fulfill({
      json: new URL(route.request().url()).pathname.endsWith(number)
        ? job
        : { items: [job], total: 1, page: 1, totalPages: 1 },
    }),
  );
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/repair\/jobs$/);
  await expect(page.getByRole('heading', { name: 'My repair jobs' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Repair bookings' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Receive a device', exact: true })).toHaveCount(0);
  await page.goto(`/admin/repair/jobs/${number}`);
  await expect(page.getByRole('heading', { name: 'Record diagnosis' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Assign technician' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Estimates & approval' }).click();
  await expect(page.getByRole('heading', { name: 'Create estimate', exact: true })).toHaveCount(0);
  await install(page, 'RECEPTION');
  await page.goto('/admin/repair/team');
  await expect(page).toHaveURL(/\/admin\/repair\/jobs$/);
  await expect(page.getByRole('link', { name: 'Repair bookings' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Customers', exact: true })).toHaveCount(0);
});
test('a stale estimate submission keeps the message and uses server version for retry', async ({
  page,
}) => {
  await install(page);
  let job = fixture();
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/api/v1/admin/repair/jobs/**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      bodies.push(body);
      if (bodies.length === 1) {
        job = { ...job, version: 1 };
        await route.fulfill({
          status: 409,
          json: { message: 'This job changed. Refresh before trying again.' },
        });
        return;
      }
      job = {
        ...job,
        version: 2,
        status: 'AWAITING_APPROVAL',
        estimates: [
          {
            revision: 1,
            lines: body.lines as RepairJob['estimates'][number]['lines'],
            totalInPaise: 249950,
            reason: String(body.reason),
            at: new Date().toISOString(),
          },
        ],
      };
    }
    await route.fulfill({ json: job });
  });
  await page.goto(`/admin/repair/jobs/${number}`);
  await page.getByRole('button', { name: 'Estimates & approval' }).click();
  await page.getByLabel('description · line 1').fill('Display replacement');
  await page.getByLabel('Unit price ₹ · line 1').fill('2499.50');
  await page.getByLabel('Reason / work performed').fill('Quote after diagnosis');
  await page.getByRole('button', { name: 'Save new estimate revision' }).click();
  await expect(page.getByRole('alert')).toContainText('This job changed');
  await page.getByRole('button', { name: 'Save new estimate revision' }).click();
  await expect(page.getByRole('heading', { name: 'Estimate 1 · latest' })).toBeVisible();
  expect(bodies.map((body) => body.expectedVersion)).toEqual([0, 1]);
  expect((bodies[1].lines as Array<{ unitPriceInPaise: number }>)[0].unitPriceInPaise).toBe(249950);
});
