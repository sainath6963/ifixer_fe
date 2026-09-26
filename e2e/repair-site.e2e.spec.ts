import { expect, test } from '@playwright/test';
import { installAnonymousApiStubs } from './api-stubs';

for (const width of [360, 390, 768, 1440]) {
  test(`repair pages and navigation fit a ${width}px viewport`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await installAnonymousApiStubs(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const [path, heading] of [
      ['/', 'A fresh start'],
      ['/services', 'Find the right'],
      ['/about', 'Good phones deserve'],
      ['/contact', 'A conversation.'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        /\/og\.png$/,
      );
      await page.screenshot({
        path: testInfo.outputPath(`${path === '/' ? 'home' : path.slice(1)}-${width}.png`),
        fullPage: true,
      });
    }
    if (width <= 960) {
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      const menu = page.getByRole('navigation', { name: 'Mobile navigation' });
      await expect(menu).toBeVisible();
      await menu.getByRole('link', { name: 'Services', exact: true }).click();
      await expect(page).toHaveURL(/\/services$/);
      await expect(menu).toBeHidden();
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeFocused();
    } else {
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeHidden();
    }
    expect(errors).toEqual([]);
  });
}

test('repair enquiry preserves the service, FAQs work with a keyboard and missing contacts are honest', async ({
  page,
}) => {
  await installAnonymousApiStubs(page);
  await page.goto('/services#battery');
  await page
    .locator('#battery')
    .getByRole('link', { name: /Discuss this repair/ })
    .click();
  await expect(page).toHaveURL(/\/contact\?service=battery$/);
  await expect(page.getByRole('heading', { name: 'Battery replacement' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Contact details coming soon.' })).toBeVisible();
  await expect(page.locator('a[href^="tel:"], a[href^="https://wa.me/"]')).toHaveCount(0);
  await page.getByRole('link', { name: /Read the repair FAQs/ }).click();
  const question = page.locator('summary').filter({ hasText: 'How much will my repair cost?' });
  await question.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/The cost depends on your phone model/)).toBeVisible();
  await page.goto('/story');
  await expect(page.getByRole('heading', { level: 1, name: /Good phones deserve/ })).toBeVisible();
});

for (const width of [360, 390, 768, 1440]) {
  test(`repair admin navigation preserves legacy operations at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await installAnonymousApiStubs(page);
    await page.route('**/api/v1/admin/auth/me', (route) =>
      route.fulfill({
        json: {
          admin: {
            id: 'repair-owner',
            name: 'Shop Owner',
            email: 'owner@example.test',
            roles: ['OWNER'],
          },
        },
      }),
    );
    await page.goto('/admin/security');
    if (width <= 960) {
      await expect(page.getByRole('navigation', { name: 'Admin navigation' })).toBeHidden();
      await page.getByRole('button', { name: 'Admin menu', exact: true }).click();
    }
    const navigation = page.getByRole('navigation', { name: 'Admin navigation' });
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Orders', exact: true })).toHaveAttribute(
      'href',
      '/admin/orders',
    );
    await expect(navigation.getByRole('link', { name: 'Catalog', exact: true })).toHaveAttribute(
      'href',
      '/admin/catalog',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`admin-${width}.png`), fullPage: true });
    if (width <= 960) {
      await page.keyboard.press('Escape');
      await expect(navigation).toBeHidden();
      await expect(page.getByRole('button', { name: 'Admin menu', exact: true })).toBeFocused();
      await page.getByRole('button', { name: 'Admin menu', exact: true }).click();
      await navigation.getByRole('link', { name: 'Orders', exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/orders$/);
      await expect(navigation).toBeHidden();
    }
  });
}

test('repair brand metadata does not replace the record metadata of legacy products', async ({
  page,
}) => {
  await installAnonymousApiStubs(page);
  for (const withImage of [true, false]) {
    const slug = withImage ? 'existing-product-photo' : 'existing-product-no-photo';
    const image = {
      mediaAssetId: 'original-photo',
      altText: 'Existing product',
      sources: {
        original: '/icon.svg',
        thumbnail: '/icon.svg',
        card: '/icon.svg',
        large: '/icon.svg',
      },
    };
    const name = withImage ? 'Existing item with photo' : 'Existing item without photo';
    await page.route(`**/api/v1/catalog/products/${slug}`, (route) =>
      route.fulfill({
        json: {
          product: {
            id: slug,
            slug,
            name,
            description: 'An existing catalog record.',
            excerpt: 'Existing item',
            categories: [],
            tags: [],
            availability: 'IN_STOCK',
            isFeatured: false,
            priceRange: { minInPaise: 10000, maxInPaise: 10000, currency: 'INR' },
            primaryImage: withImage ? image : undefined,
            images: withImage ? [image] : [],
            variants: [],
            publishedAt: '2026-09-26T00:00:00Z',
          },
        },
      }),
    );
    await page.goto(`/products/${slug}`);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page).toHaveTitle(`${name} | iFixer`);
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]'])
      await expect(page.locator(selector)).toHaveAttribute('content', `${name} | iFixer`);
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ])
      await expect(page.locator(selector)).toHaveAttribute(
        'content',
        'An existing catalog record.',
      );
    if (withImage)
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        /^http:\/\/127\.0\.0\.1:4173\/icon\.svg$/,
      );
    else
      await expect(
        page.locator('meta[property="og:image"], meta[name="twitter:image"]'),
      ).toHaveCount(0);
  }
});
