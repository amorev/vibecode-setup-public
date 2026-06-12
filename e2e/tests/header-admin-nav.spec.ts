import { test, expect } from '../fixtures';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('Header admin navigation', () => {
  test('clicking Admin button in header navigates to admin panel', async ({ connectedPage: page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/#/login`);
    await page.getByPlaceholder('admin').waitFor({ state: 'visible', timeout: 10_000 });
    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: 'Войти' }).click();

    // After login we land on admin panel
    await page.waitForURL(/\/#\/admin/, { timeout: 15_000 });

    // Go to a non-admin page (public home) where the global header is rendered
    await page.goto(`${BASE_URL}/#/`);
    await page.waitForSelector('text=User Management', { timeout: 10_000 });

    // Click the "Админ" button in the header
    const adminButton = page.getByRole('button', { name: 'Админ' });
    await expect(adminButton).toBeVisible({ timeout: 5_000 });
    await adminButton.click();

    // Should navigate to /#/admin (not /#/admin/users which 404s)
    await page.waitForURL(/\/#\/admin(\?|#|$)/, { timeout: 10_000 });

    // URL must NOT contain "/admin/users" — that route doesn't exist
    const url = page.url();
    expect(url).not.toContain('/admin/users');

    // Admin panel UI is rendered (Users management heading from AdminLayout)
    await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Пользователи' })).toBeVisible({ timeout: 10_000 });
  });
});