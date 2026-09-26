import { expect, test } from '@playwright/test';

import { installAnonymousApiStubs } from './api-stubs';

test.beforeEach(async ({ page }) => {
  await installAnonymousApiStubs(page);
});

test('customer can enter the storefront, browse, and create a URL-owned search', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveTitle('iFixer');
  await expect(page.getByRole('heading', { level: 1, name: /A fresh start/i })).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  );

  await page.getByText('Previous store', { exact: true }).click();
  await page.getByRole('link', { name: 'Store catalog', exact: true }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole('heading', { level: 1, name: 'The collection' })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search products' }).fill('linen shirt');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await expect(page).toHaveURL(/\/catalog\?search=linen(?:\+|%20)shirt/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('protected customer and admin deep links preserve a safe sign-in boundary', async ({
  page,
}) => {
  await page.goto('/checkout?step=shipping');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome back.' })).toBeVisible();

  await page.goto('/admin/orders?financialStatus=PAID');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Admin sign in' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('mobile navigation opens, closes on Escape, and navigates without animation dependence', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const menuButton = page.getByRole('button', { name: 'Menu' });
  await menuButton.click();
  await expect(page.getByRole('button', { name: 'Close' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );

  await page.getByRole('button', { name: 'Menu' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'About iFixer' })
    .click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { level: 1, name: /Good phones deserve/i })).toBeVisible();
});

test('offline state is explicit and clears when the connection returns', async ({
  context,
  page,
}) => {
  await page.goto('/');

  await context.setOffline(true);
  await expect(page.getByRole('status')).toContainText('You’re offline.');
  await expect(page.getByRole('status')).toContainText(
    'payments will not be retried automatically',
  );

  await context.setOffline(false);
  await expect(page.getByRole('status')).toBeHidden();
});
