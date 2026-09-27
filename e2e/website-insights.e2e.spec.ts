import { expect, test, type Page, type Route } from '@playwright/test';

import { installAnonymousApiStubs } from './api-stubs';

async function json(route: Route, status: number, body: object): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function install(page: Page, role = 'OWNER') {
  await installAnonymousApiStubs(page);
  let setting = { googleReviewUrl: '', configured: false, version: 0 };
  const events: string[] = [];

  await page.route('**/api/v1/admin/auth/me', (route) =>
    json(route, 200, {
      admin: {
        id: 'website-owner',
        name: 'Website Owner',
        email: 'owner@example.test',
        roles: [role],
      },
    }),
  );
  await page.route('**/api/v1/admin/website/insights?*', (route) =>
    json(route, 200, {
      period: {
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
        timezone: 'Asia/Kolkata',
        days: 30,
        granularity: 'DAY',
      },
      kpis: {
        pageViews: { value: 1240, previousValue: 900, changePercent: 37.8 },
        visits: { value: 710, previousValue: 600, changePercent: 18.3 },
        uniqueVisitors: { value: 520, previousValue: 480, changePercent: 8.3 },
        googleReviewClicks: { value: 42, previousValue: 21, changePercent: 100 },
      },
      trend: [
        { key: '2026-09-01', pageViews: 400, visits: 250, uniqueVisitors: 200 },
        { key: '2026-09-02', pageViews: 840, visits: 460, uniqueVisitors: 320 },
      ],
      topPages: [
        { path: '/', pageViews: 700, visits: 500 },
        { path: '/services', pageViews: 300, visits: 220 },
      ],
      sources: [
        { source: 'GOOGLE', visits: 400 },
        { source: 'DIRECT', visits: 310 },
      ],
      devices: [
        { device: 'MOBILE', pageViews: 900, visits: 530 },
        { device: 'DESKTOP', pageViews: 340, visits: 180 },
      ],
      generatedAt: '2026-09-27T10:00:00.000Z',
    }),
  );
  await page.route('**/api/v1/admin/website/review-settings', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { googleReviewUrl: string };
      setting = {
        googleReviewUrl: body.googleReviewUrl,
        configured: Boolean(body.googleReviewUrl),
        version: setting.version + 1,
      };
      await json(route, 201, setting);
      return;
    }
    await json(route, 200, setting);
  });
  await page.route('**/api/v1/website/review-link', (route) =>
    json(route, 200, { googleReviewUrl: setting.googleReviewUrl || null }),
  );
  await page.route('**/api/v1/website/page-view', async (route) => {
    events.push('PAGE_VIEW');
    await json(route, 201, { recorded: true });
  });
  await page.route('**/api/v1/website/google-review-click', async (route) => {
    events.push('GOOGLE_REVIEW_CLICK');
    await json(route, 201, { recorded: true });
  });
  await page.route('https://g.page/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Google review fixture</h1>' }),
  );
  return { events, setting: () => setting };
}

test('owner sees responsive website traffic and enables the Google review CTA', async ({
  page,
}) => {
  const fixture = await install(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/website');

  await expect(page.getByRole('heading', { level: 1, name: 'Website traffic' })).toBeVisible();
  await expect(page.getByText('Page views').locator('..').getByText('1,240')).toBeVisible();
  await expect(page.getByText('Unique visitors').locator('..').getByText('520')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Traffic trend' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Top pages' })).toBeVisible();
  await expect(page.getByText('/services')).toBeVisible();
  await expect(page.getByText('Google', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByLabel('Google review link').fill('https://g.page/r/ifixerpune/review');
  await page.getByRole('button', { name: 'Save review link' }).click();
  await expect(page.getByRole('status')).toContainText('available on the website');
  expect(fixture.setting()).toMatchObject({ configured: true, version: 1 });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Happy with your repair?' })).toBeVisible();
  const reviewLink = page.getByRole('link', { name: /Review iFixer on Google/ });
  await expect(reviewLink).toHaveAttribute('href', 'https://g.page/r/ifixerpune/review');
  await expect
    .poll(() => fixture.events.filter((event) => event === 'PAGE_VIEW').length)
    .toBeGreaterThan(0);
  const clickRequest = page.waitForRequest('**/api/v1/website/google-review-click');
  const popup = page.waitForEvent('popup');
  await reviewLink.click();
  await clickRequest;
  await (await popup).close();
  expect(fixture.events).toContain('GOOGLE_REVIEW_CLICK');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('staff can view traffic but cannot edit the owner review setting', async ({ page }) => {
  await install(page, 'STAFF');
  await page.goto('/admin/website');
  await expect(page.getByRole('heading', { level: 1, name: 'Website traffic' })).toBeVisible();
  await expect(page.getByText('Only an owner can change this link.')).toBeVisible();
  await expect(page.getByLabel('Google review link')).toHaveCount(0);
});
