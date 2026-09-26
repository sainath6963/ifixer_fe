import { expect, test, type Page, type Route } from '@playwright/test';

const actionToken = 'phase12_secure_customer_action_token_1234567890';

async function json(route: Route, status: number, body?: object): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: body ? JSON.stringify(body) : '',
  });
}

async function installRecoveryApiStubs(page: Page): Promise<() => string[]> {
  const mutations: string[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname.endsWith('/customer/auth/csrf')) {
      await json(route, 200, { csrfToken: 'e2e-csrf-token', expiresInSeconds: 7200 });
      return;
    }

    if (pathname.endsWith('/customer/auth/forgot-password')) {
      mutations.push('forgot');
      await json(route, 202, {
        message: 'If an eligible account exists, reset instructions will be sent.',
      });
      return;
    }

    if (pathname.endsWith('/customer/auth/verify-email')) {
      mutations.push('verify');
      await json(route, 204);
      return;
    }

    if (pathname.endsWith('/customer/auth/reset-password')) {
      mutations.push('reset');
      await json(route, 204);
      return;
    }

    if (
      pathname.endsWith('/customer/auth/me') ||
      pathname.endsWith('/customer/auth/refresh') ||
      pathname.includes('/admin/auth/')
    ) {
      await json(route, 401, { code: 'UNAUTHENTICATED', message: 'Authentication required' });
      return;
    }

    if (pathname.endsWith('/cart')) {
      await json(route, 200, {
        cart: {
          version: 0,
          items: [],
          distinctItemCount: 0,
          totalQuantity: 0,
          subtotalInPaise: 0,
          currency: 'INR',
          readyForCheckout: false,
        },
      });
      return;
    }

    await json(route, 404, { code: 'E2E_ROUTE_NOT_STUBBED', message: pathname });
  });
  return () => mutations;
}

test.beforeEach(async ({ page }) => {
  await installRecoveryApiStubs(page);
});

test('forgot-password response does not disclose whether the account exists', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('customer@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();

  await expect(page.getByRole('status')).toHaveText(
    'If an eligible account exists, reset instructions will be sent.',
  );
});

test('email verification waits for confirmation and removes the token from browser history', async ({
  page,
}) => {
  await page.goto(`/verify-email?token=${actionToken}`);
  await expect(page).toHaveURL(/\/verify-email$/);
  await expect(page.getByRole('button', { name: 'Verify email' })).toBeEnabled();
  await page.getByRole('button', { name: 'Verify email' }).click();

  await expect(page.getByRole('status')).toHaveText('Your email is verified.');
});

test('one-time reset form accepts a strong password and returns to sign in', async ({ page }) => {
  await page.goto(`/reset-password?token=${actionToken}`);
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel(/^New password/).fill('A-new-secure-password-2026');
  await page.getByLabel('Confirm new password').fill('A-new-secure-password-2026');
  await page.getByRole('button', { name: 'Reset password' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('status')).toHaveText(
    'Password reset. Sign in with your new password.',
  );
});
