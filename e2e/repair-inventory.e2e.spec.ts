import { expect, test, type Page } from '@playwright/test';
import { installAnonymousApiStubs } from './api-stubs';
import type { Part, Purchase } from '../src/features/repair-inventory/inventory.types';
const id = '111111111111111111111111';
const supplierId = '222222222222222222222222';
const purchaseId = '333333333333333333333333';
const part: Part = {
  id,
  version: 0,
  sku: 'SCREEN-TEST-PRO',
  name: 'Replacement display module',
  quality: 'Premium grade',
  modelIds: [],
  modelLabels: ['Example Phone Pro'],
  bin: 'Shelf A-1',
  referenceCostInPaise: 120000,
  customerPriceInPaise: 250000,
  active: true,
  openingRecorded: true,
  stock: {
    version: 1,
    onHand: 10,
    reserved: 1,
    available: 9,
    repairConsumed: 0,
    reorderPoint: 3,
    lowStock: false,
  },
};
const purchase: Purchase = {
  id: purchaseId,
  version: 1,
  number: 'PO-1234567890ABCDEF',
  supplierName: 'Example parts supplier',
  status: 'PARTIAL',
  note: 'Parts for display repairs',
  createdAt: '2026-09-27T10:00:00Z',
  lines: [
    {
      partId: id,
      sku: part.sku,
      name: part.name,
      ordered: 10,
      received: 2,
      unitCostInPaise: 120000,
    },
  ],
  receipts: [
    {
      id: 'receipt',
      reference: 'DELIVERY-001',
      note: 'Two inspected screens received',
      createdAt: '2026-09-27T10:00:00Z',
      lines: [{ partId: id, lineIndex: 0, quantity: 2, unitCostInPaise: 125000 }],
    },
  ],
};
const paged = <T>(items: T[]) => ({ items, total: items.length, page: 1, totalPages: 1 });
async function install(page: Page, role = 'OWNER') {
  await installAnonymousApiStubs(page);
  await page.route('**/api/v1/admin/auth/me', (route) =>
    route.fulfill({
      json: {
        admin: {
          id: 'stock-owner',
          name: 'Stock user',
          email: 'stock@example.test',
          roles: [role],
        },
      },
    }),
  );
  await page.route('**/api/v1/admin/repair/inventory/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const view = role === 'OWNER' ? part : { ...part, referenceCostInPaise: undefined };
    const json = path.endsWith('/lots')
      ? paged([
          {
            id: 'lot-1',
            source: 'RECEIPT',
            quantity: 10,
            remaining: 10,
            unitCostInPaise: 120000,
            supplierId,
            purchaseId,
            createdAt: '2026-09-27T10:00:00Z',
          },
        ])
      : path.endsWith(`/parts/${id}`)
        ? view
        : path.endsWith('/parts')
          ? paged([view])
          : path.endsWith(`/purchases/${purchaseId}`)
            ? purchase
            : path.endsWith('/purchases')
              ? paged([purchase])
              : path.endsWith('/suppliers')
                ? paged([
                    {
                      id: supplierId,
                      version: 0,
                      name: 'Example parts supplier',
                      code: 'SUP-01',
                      active: true,
                    },
                  ])
                : paged([
                    {
                      id: 'move-1',
                      partId: id,
                      sku: part.sku,
                      action: 'REPAIR_CONSUME',
                      deltaOnHand: -1,
                      deltaReserved: -1,
                      deltaConsumed: 1,
                      knownCostInPaise: 120000,
                      unknownCostQuantity: 0,
                      note: 'Display fitted to job',
                      createdAt: '2026-09-27T10:00:00Z',
                    },
                  ]);
    return route.fulfill({ json });
  });
}
for (const width of [360, 390, 768, 1440]) {
  test(`inventory, purchase receipts and stock forms fit ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await install(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const [path, heading] of [
      ['/admin/repair/inventory', 'Parts & inventory'],
      [`/admin/repair/inventory/parts/${id}`, part.name],
      [`/admin/repair/inventory/purchases/${purchaseId}`, purchase.number],
      ['/admin/repair/inventory?tab=movements', 'Stock movement history'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: info.outputPath(`${heading.replaceAll(' ', '-')}-${width}.png`),
        fullPage: true,
      });
    }
    await page.goto('/admin/repair/inventory?tab=purchases');
    await page.getByText('New purchase order', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Create purchase order' })).toBeVisible();
    await page.getByRole('button', { name: 'Add purchase line' }).click();
    await expect(page.getByRole('heading', { name: 'Order line 2' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}
test('a lost stock response survives reload and retries the original payload and version', async ({
  page,
}) => {
  await install(page);
  const calls: unknown[] = [];
  await page.route(`**/api/v1/admin/repair/inventory/parts/${id}/adjustments`, async (route) => {
    calls.push(route.request().postDataJSON() as unknown);
    if (calls.length === 1) return route.abort('failed');
    return route.fulfill({
      json: { ...part, stock: { ...part.stock, onHand: 12, available: 11, version: 2 } },
    });
  });
  await page.goto(`/admin/repair/inventory/parts/${id}`);
  const form = page.getByRole('form', { name: 'Record stock change' });
  await form.getByLabel('Quantity', { exact: true }).fill('2');
  await form.getByLabel('Reason / reference').fill('Verified physical count');
  await form.getByRole('button', { name: 'Record stock change' }).click();
  await expect(page.getByRole('button', { name: 'Retry saved request' })).toBeVisible();
  await expect(form.getByLabel('Quantity', { exact: true })).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: 'Retry saved request' }).click();
  await expect(page.getByText('Saved. Stock and job details refreshed.')).toBeVisible();
  expect(calls).toHaveLength(2);
  expect(calls[1]).toEqual(calls[0]);
});
test('stock writes stop before sending when a durable retry record cannot be saved', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'setItem', {
      value() {
        throw new DOMException('Blocked storage', 'SecurityError');
      },
    });
  });
  await install(page);
  let writes = 0;
  await page.route(`**/api/v1/admin/repair/inventory/parts/${id}/adjustments`, (route) => {
    writes += 1;
    return route.fulfill({ json: part });
  });
  await page.goto(`/admin/repair/inventory/parts/${id}`);
  const form = page.getByRole('form', { name: 'Record stock change' });
  await form.getByLabel('Reason / reference').fill('Physical count');
  await form.getByRole('button', { name: 'Record stock change' }).click();
  await expect(page.getByRole('alert')).toContainText('Browser storage is unavailable');
  expect(writes).toBe(0);
});
test('reception sees availability and customer prices without stock management or cost controls', async ({
  page,
}) => {
  await install(page, 'RECEPTION');
  await page.goto('/admin/repair/inventory');
  await expect(page.getByRole('heading', { name: 'Parts & inventory' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add spare part' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Suppliers' })).toHaveCount(0);
  await page.getByRole('link', { name: part.name, exact: true }).click();
  await expect(page.getByText('Customer price ₹2,500.00')).toBeVisible();
  await expect(page.getByText(/Reference cost/)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Record stock change' })).toHaveCount(0);
});

test('editing a part preserves saved compatibility while the model catalog loads', async ({
  page,
}) => {
  await install(page);
  const modelId = '444444444444444444444444';
  const saved = { ...part, modelIds: [modelId] };
  let body: Record<string, unknown> | undefined;
  await page.route(`**/api/v1/admin/repair/inventory/parts/${id}`, (route) => {
    if (route.request().method() === 'PATCH')
      body = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({ json: saved });
  });
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/admin/repair/catalog', async (route) => {
    await pending;
    await route.fulfill({
      json: {
        brands: [],
        models: [
          { id: modelId, name: 'Example Phone Pro', active: true, version: 0, sortOrder: 0 },
        ],
        services: [],
        options: [],
      },
    });
  });
  await page.goto(`/admin/repair/inventory/parts/${id}`);
  await page.locator('summary').filter({ hasText: 'Edit part details' }).click();
  const form = page.getByRole('form', { name: 'Edit part details', exact: true });
  await expect(form.getByRole('listbox', { name: 'Compatible models' })).toHaveValues([modelId]);
  release();
  await expect(form.getByText('Loading…')).toHaveCount(0);
  await expect(form.getByRole('listbox', { name: 'Compatible models' })).toHaveValues([modelId]);
  await form.getByLabel('Storage bin').fill('Shelf B-2');
  await form.getByRole('button', { name: 'Save part details' }).click();
  await expect(page.getByText('Saved. Stock and job details refreshed.')).toBeVisible();
  expect(body?.modelIds).toEqual([modelId]);
});
