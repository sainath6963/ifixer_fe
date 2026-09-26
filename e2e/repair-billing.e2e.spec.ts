import { expect, test, type Page } from '@playwright/test';
import { installAnonymousApiStubs } from './api-stubs';
import type {
  JobBilling,
  BillingSettings,
  Invoice,
} from '../src/features/repair-billing/billing.types';
import type { RepairJob } from '../src/features/repair-jobs/job.types';
const number = 'JOB-1234567890ABCDEF';
const settings: BillingSettings = {
  configured: true,
  version: 0,
  issuer: { name: 'iFixer workshop', address: 'Example workshop address', phone: '+919876543210' },
  taxes: [{ label: 'Configured test tax', rateBps: 1000 }],
  warrantyDays: 30,
  warrantyCoverage: 'Replacement display workmanship',
  warrantyExclusions: 'Physical or liquid damage',
};
const invoice: Invoice = {
  id: '111111111111111111111111',
  number: 'INV-000001',
  jobNumber: number,
  issuer: settings.issuer!,
  customerName: 'Repair Customer',
  phone: '+919876543210',
  deviceLabel: 'Example Phone Pro',
  estimateRevision: 1,
  lines: [
    { kind: 'PART', description: 'Replacement screen', quantity: 1, unitPriceInPaise: 100000 },
    { kind: 'LABOUR', description: 'Fitting and testing', quantity: 1, unitPriceInPaise: 10000 },
  ],
  subtotalInPaise: 110000,
  discountInPaise: 10000,
  taxableInPaise: 100000,
  taxes: [{ label: 'Configured test tax', rateBps: 1000, amountInPaise: 10000 }],
  totalInPaise: 110000,
  warrantyDays: 30,
  warrantyCoverage: settings.warrantyCoverage!,
  warrantyExclusions: settings.warrantyExclusions!,
  issuedAt: '2026-09-27T10:00:00Z',
  issuedByName: 'Owner',
};
function bill(): JobBilling {
  return {
    jobNumber: number,
    jobVersion: 5,
    invoice,
    entries: [
      {
        id: '222222222222222222222222',
        number: 'RCP-000001',
        jobNumber: number,
        kind: 'PAYMENT',
        amountInPaise: 10000,
        method: 'CASH',
        reason: 'Advance received',
        issuer: settings.issuer!,
        customerName: invoice.customerName,
        recordedByName: 'Reception',
        recordedAt: '2026-09-27T09:00:00Z',
        verification: 'STAFF_RECORDED',
      },
    ],
    summary: {
      receivedInPaise: 10000,
      refundedInPaise: 0,
      netPaidInPaise: 10000,
      creditedInPaise: 0,
      chargeInPaise: 110000,
      dueInPaise: 100000,
      refundDueInPaise: 0,
      advanceInPaise: 0,
    },
    warranty: { days: 30, active: false },
    deliveryAuthorization: null,
    followups: [],
    permissions: { owner: true },
  };
}
function job(): RepairJob {
  return {
    number,
    version: 5,
    customerName: invoice.customerName,
    phone: invoice.phone,
    deviceLabel: invoice.deviceLabel,
    issue: 'Screen cracked and flickering',
    condition: 'Cracked glass',
    accessories: 'Case only',
    status: 'READY',
    custody: 'IN_SHOP',
    createdAt: '2026-09-27T08:00:00Z',
    diagnosis: 'Display assembly damaged',
    estimates: [
      {
        revision: 1,
        lines: [{ description: 'Screen repair', quantity: 1, unitPriceInPaise: 200000 }],
        totalInPaise: 200000,
        reason: 'Initial quote',
        at: '2026-09-27T09:00:00Z',
        approval: {
          decision: 'APPROVED',
          method: 'PHONE',
          customerName: invoice.customerName,
          evidence: 'Customer accepted repair quote',
          at: '2026-09-27T09:00:00Z',
        },
      },
    ],
    tests: [],
    history: [
      {
        at: '2026-09-27T10:00:00Z',
        actorName: 'Owner',
        action: 'NOTE',
        status: 'READY',
        reason: 'PRIVATE WORKSHOP NOTE',
      },
    ],
    photos: [],
    permissions: { manage: true, repair: true },
    billingInvoiceNumber: invoice.number,
  };
}
async function install(page: Page, role = 'OWNER', data = bill()) {
  await installAnonymousApiStubs(page);
  await page.route('**/api/v1/admin/auth/me', (route) =>
    route.fulfill({
      json: {
        admin: {
          id: 'billing-user',
          name: 'Workshop user',
          email: 'owner@example.test',
          roles: [role],
        },
      },
    }),
  );
  await page.route('**/api/v1/admin/repair/billing/settings', (route) =>
    route.fulfill({ json: settings }),
  );
  await page.route('**/api/v1/admin/repair/billing/invoices**', (route) =>
    route.fulfill({
      json: { items: [{ ...invoice, summary: data.summary }], total: 1, page: 1, totalPages: 1 },
    }),
  );
  await page.route(`**/api/v1/admin/repair/jobs/${number}`, (route) =>
    route.fulfill({ json: job() }),
  );
  await page.route(`**/api/v1/admin/repair/jobs/${number}/billing`, (route) =>
    route.fulfill({ json: data }),
  );
}
for (const width of [360, 390, 768, 1440]) {
  test(`billing settings, job accounts and printable invoices fit ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await install(page);
    await page.goto('/admin/repair/billing');
    await expect(
      page.getByRole('heading', { name: 'Billing & warranty', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Billing settings', exact: true }).click();
    await expect(page.getByLabel('Warranty days')).toHaveValue('30');
    await page.getByRole('button', { name: 'Add tax component' }).click();
    await expect(page.getByLabel('Tax rate % 2')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.goto(`/admin/repair/jobs/${number}?tab=billing`);
    await expect(
      page.getByRole('heading', { name: 'Billing & warranty', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Invoice INV-000001 · ₹1,100.00')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: info.outputPath(`billing-${width}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('link', { name: 'Print / save invoice PDF' }).click();
    await expect(page.getByRole('heading', { name: 'Repair invoice', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('button', { name: 'Print / save PDF' })).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Admin navigation' })).toBeHidden();
    await expect(page.getByText('PRIVATE WORKSHOP NOTE')).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`invoice-${width}.png`),
      fullPage: true,
      animations: 'disabled',
    });
  });
}
test('an uncertain payment survives reload and a throttled retry without generating another operation key', async ({
  page,
}) => {
  await install(page);
  const calls: unknown[] = [];
  await page.route(`**/api/v1/admin/repair/jobs/${number}/billing/payments`, async (route) => {
    calls.push(route.request().postDataJSON() as unknown);
    if (calls.length === 1) return route.abort('failed');
    if (calls.length === 2)
      return route.fulfill({ status: 429, json: { message: 'Please retry shortly' } });
    return route.fulfill({ json: bill() });
  });
  await page.goto(`/admin/repair/jobs/${number}?tab=billing`);
  const form = page.getByRole('form', { name: 'Record payment', exact: true });
  await form.getByLabel('Amount received ₹').fill('100');
  await form.getByLabel('Receipt note (shown to customer)').fill('Cash received at counter');
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Record received payment' }).click();
  await expect(page.getByRole('button', { name: 'Retry saved request' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Retry saved request' }).click();
  await expect(page.getByRole('alert')).toContainText('Please retry shortly');
  await expect(form.getByLabel('Amount received ₹')).toBeDisabled();
  await page.getByRole('button', { name: 'Retry saved request' }).click();
  await expect(page.getByText('Saved. Billing and job details refreshed.')).toBeVisible();
  expect(calls).toHaveLength(3);
  expect(calls[1]).toEqual(calls[0]);
  expect(calls[2]).toEqual(calls[0]);
});
test('reception can record payments but cannot change settings, refund or authorize unpaid delivery', async ({
  page,
}) => {
  const data = bill();
  data.permissions.owner = false;
  await install(page, 'RECEPTION', data);
  await page.goto('/admin/repair/billing');
  await expect(page.getByRole('button', { name: 'Billing settings' })).toHaveCount(0);
  await page.goto(`/admin/repair/jobs/${number}?tab=billing`);
  await expect(page.getByRole('form', { name: 'Record payment', exact: true })).toBeVisible();
  await expect(page.getByText('Record money returned', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Owner delivery authorization' })).toHaveCount(0);
});
test('a receipt prints its own payment amount and an unknown receipt never falls back to an invoice', async ({
  page,
}) => {
  await install(page);
  await page.goto(`/admin/repair/jobs/${number}/billing/print?receipt=222222222222222222222222`);
  await expect(page.getByRole('heading', { name: 'Payment receipt', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '₹100.00', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Repair invoice', exact: true })).toHaveCount(0);
  await page.goto(`/admin/repair/jobs/${number}/billing/print?receipt=missing`);
  await expect(page.getByRole('alert')).toContainText('not found');
  await expect(page.locator('.billing-document')).toHaveCount(0);
});
