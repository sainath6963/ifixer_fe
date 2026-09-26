import { expect, test } from '@playwright/test';

test('deployed API dependencies are live and ready', async ({ request }) => {
  const live = await request.get('/api/v1/health/live');
  expect(live.ok(), await live.text()).toBeTruthy();
  expect(await live.text()).toContain('"status":"ok"');

  const ready = await request.get('/api/v1/health/ready');
  expect(ready.ok(), await ready.text()).toBeTruthy();
  const readiness = await ready.text();
  expect(readiness).toContain('"status":"ok"');
  expect(readiness).not.toContain('mongodb');
  expect(readiness).not.toContain('mediaStorage');
});

test('deployed storefront, SPA routes, and public metadata are available', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Made to be remembered.' }),
  ).toBeVisible();

  await page.goto('/story');
  await expect(
    page.getByRole('heading', { level: 1, name: /wear what you stand for/i }),
  ).toBeVisible();

  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  expect(await manifest.text()).toContain('"name": "Rich Culture"');

  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain('Disallow: /admin');

  const storefront = await request.get('/');
  expect(storefront.headers()['x-frame-options']).toBe('DENY');
  expect(storefront.headers()['x-content-type-options']).toBe('nosniff');
  expect(storefront.headers()['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
  expect(storefront.headers()['strict-transport-security']).toMatch(/max-age=\d+/);
  expect(storefront.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(storefront.headers()['content-security-policy']).toContain('checkout.razorpay.com');
});

test('deployed admin boundary is reachable and excluded from indexing', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Admin sign in' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});
