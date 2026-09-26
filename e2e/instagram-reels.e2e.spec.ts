import { expect, test, type Page } from '@playwright/test';
import { installAnonymousApiStubs } from './api-stubs';
const url = 'https://www.instagram.com/reel/WORKSHOP123/';
const saved = {
  id: '111111111111111111111111',
  url,
  title: 'Screen repair at iFixer',
  sortOrder: 0,
  active: true,
  version: 0,
};
async function install(page: Page, role = 'OWNER') {
  await installAnonymousApiStubs(page);
  await page.route('**/api/v1/admin/auth/me', (route) =>
    route.fulfill({
      json: {
        admin: {
          id: 'reel-admin',
          name: 'Reel editor',
          email: 'editor@example.test',
          roles: [role],
        },
      },
    }),
  );
  await page.route('**/api/v1/**/reels?*', (route) =>
    route.fulfill({ json: { items: [saved], total: 1, totalPages: 1, page: 1 } }),
  );
  await page.route('https://www.instagram.com/reel/**/embed/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body>Instagram embed fixture</body></html>',
    }),
  );
}
for (const width of [360, 390, 768, 1440]) {
  test(`admin Reel links and homepage embeds fit ${width}px`, async ({ page }, info) => {
    await install(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/admin/repair/reels');
    await expect(page.getByRole('heading', { name: 'Instagram reels', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edit Screen repair at iFixer', exact: true }).click();
    await expect(page.getByLabel('Instagram Reel link')).toHaveValue(url);
    await page.getByRole('button', { name: 'Preview saved reel' }).click();
    await expect(page.locator('iframe')).toHaveAttribute('src', url + 'embed/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath(`admin-reels-${width}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.goto('/#workshop-reels');
    const section = page.getByRole('region', { name: 'From our workshop.' });
    await expect(section).toBeVisible();
    await expect(section.locator('iframe')).toHaveAttribute('loading', 'lazy');
    await expect(section.getByRole('link', { name: /Watch on Instagram/ })).toHaveAttribute(
      'href',
      url,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await section.screenshot({
      path: info.outputPath(`workshop-reels-${width}.png`),
      animations: 'disabled',
    });
  });
}
test('admin can save a link, edit its order and hide it from the homepage', async ({ page }) => {
  await install(page);
  let item: typeof saved | undefined;
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/v1/**/reels**', async (route) => {
    if (route.request().method() !== 'GET') {
      const data = route.request().postDataJSON() as typeof saved & { expectedVersion?: number };
      requests.push(data);
      item = { ...saved, ...data, version: item ? item.version + 1 : 0 };
      await route.fulfill({ status: route.request().method() === 'POST' ? 201 : 200, json: item });
      return;
    }
    const visible = item && (route.request().url().includes('/admin/') || item.active);
    await route.fulfill({
      json: {
        items: visible ? [item] : [],
        total: visible ? 1 : 0,
        page: 1,
        totalPages: visible ? 1 : 0,
      },
    });
  });
  await page.goto('/admin/repair/reels');
  await page.getByLabel('Instagram Reel link').fill(url);
  await page.getByLabel('Title (optional)').fill(saved.title);
  await page.getByRole('button', { name: 'Save reel', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Reel saved and shown on the homepage.');
  expect(requests[0]).toMatchObject({ url, active: true, title: saved.title });
  await page.goto('/#workshop-reels');
  await expect(page.getByRole('region', { name: 'From our workshop.' })).toBeVisible();
  await page.goto('/admin/repair/reels');
  await page.getByRole('button', { name: 'Edit Screen repair at iFixer', exact: true }).click();
  await page.getByLabel('Display order').fill('5');
  await page.getByLabel('Show on website').uncheck();
  await page.getByRole('button', { name: 'Save reel', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Reel saved and hidden from the homepage.');
  expect(requests[1]).toMatchObject({ expectedVersion: 0, sortOrder: 5, active: false });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'From our workshop.' })).toHaveCount(0);
});
test('blocked Instagram frames keep a usable external link and API failure leaves home usable', async ({
  page,
}) => {
  await install(page);
  await page.route('https://www.instagram.com/reel/**/embed/', (route) => route.abort('failed'));
  await page.goto('/#workshop-reels');
  await expect(page.getByRole('link', { name: /Watch on Instagram/ })).toBeVisible();
  await page.route('**/api/v1/repair/reels?*', (route) =>
    route.fulfill({ status: 503, json: { message: 'Unavailable' } }),
  );
  await page.reload();
  await expect(page.getByRole('link', { name: /Explore repairs/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'From our workshop.' })).toHaveCount(0);
});
test('reception cannot open Reel administration', async ({ page }) => {
  await install(page, 'RECEPTION');
  await page.goto('/admin/repair/reels');
  await expect(page.getByRole('heading', { name: 'Instagram reels', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Instagram reels', exact: true })).toHaveCount(0);
});

test('only the matching Instagram frame can resize its card, within bounded heights', async ({
  page,
}) => {
  await install(page);
  await page.goto('/#workshop-reels');
  const iframe = page.locator('.workshop-reel iframe');
  await iframe.scrollIntoViewIfNeeded();
  const provider = page.frameLocator('.workshop-reel iframe');
  await expect(provider.locator('body')).toContainText('Instagram embed fixture');
  await provider
    .locator('body')
    .evaluate(() =>
      parent.postMessage(JSON.stringify({ type: 'MEASURE', details: { height: 740 } }), '*'),
    );
  await expect(iframe).toHaveCSS('height', '740px');
  await page.evaluate(() => {
    const frame = document.querySelector('iframe')!;
    for (const [origin, source] of [
      ['https://evil.test', frame.contentWindow],
      ['https://www.instagram.com', window],
    ] as const) {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin,
          source,
          data: { type: 'MEASURE', details: { height: 1400 } },
        }),
      );
    }
  });
  await provider
    .locator('body')
    .evaluate(() =>
      parent.postMessage(JSON.stringify({ type: 'MEASURE', details: { height: 999999 } }), '*'),
    );
  await expect(iframe).toHaveCSS('height', '740px');
});
