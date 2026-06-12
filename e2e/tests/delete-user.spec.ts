import { test, expect } from '../fixtures';
import axios from 'axios';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api';

/**
 * Helper: login as admin and return the JWT token.
 */
async function loginAsAdmin(): Promise<string> {
  const res = await axios.post(`${API_URL}/auth/login`, {
    login: 'admin',
    password: 'admin123',
  });
  return res.data.access_token;
}

/**
 * Helper: create a user via API and return its id.
 */
async function createUser(login: string, password = 'test1234', role: 'admin' | 'user' = 'user'): Promise<number> {
  const token = await loginAsAdmin();
  const res = await axios.post(
    `${API_URL}/users`,
    { login, password, role },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data.id;
}

/**
 * Helper: cleanup test users (best effort — ignore errors).
 */
async function cleanupUser(id: number): Promise<void> {
  try {
    const token = await loginAsAdmin();
    await axios.delete(`${API_URL}/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Ignore
  }
}

test.describe('Delete user', () => {
  test('should delete a user through the admin UI', async ({ connectedPage: page }) => {
    const login = `delete-me-${Date.now()}`;
    const createdId = await createUser(login);

    try {
      // 1. Login to admin panel
      await page.goto(`${BASE_URL}/#/login`);
      await page.getByPlaceholder('admin').fill('admin');
      await page.getByPlaceholder('••••••••').fill('admin123');
      await page.getByRole('button', { name: 'Войти' }).click();
      await page.waitForURL(/\/#\/admin/, { timeout: 15_000 });
      await page.getByRole('heading', { name: 'Пользователи' }).waitFor({ state: 'visible', timeout: 10_000 });

      // 2. Verify the user is in the table
      const row = page.getByRole('row', { name: new RegExp(login) });
      await expect(row).toBeVisible({ timeout: 10_000 });

      // 3. Click "Удалить" in that row
      await row.getByRole('button', { name: 'Удалить' }).click();

      // 4. Modal should appear with the user login
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible({ timeout: 5_000 });
      await expect(modal).toContainText(login);
      await expect(modal).toContainText('напоминания');

      // 5. Click confirm "Удалить" inside the modal
      await modal.getByRole('button', { name: 'Удалить' }).click();

      // 6. Modal should switch to success state
      await expect(modal).toContainText('Пользователь удалён', { timeout: 10_000 });

      // 7. Click "Готово" to dismiss
      await modal.getByRole('button', { name: 'Готово' }).click();
      await expect(modal).not.toBeVisible();

      // 8. Row should be gone from the table
      await expect(row).not.toBeVisible({ timeout: 5_000 });
    } finally {
      await cleanupUser(createdId);
    }
  });

  test('should cancel deletion when clicking "Отмена"', async ({ connectedPage: page }) => {
    const login = `cancel-delete-${Date.now()}`;
    const createdId = await createUser(login);

    try {
      await page.goto(`${BASE_URL}/#/login`);
      await page.getByPlaceholder('admin').fill('admin');
      await page.getByPlaceholder('••••••••').fill('admin123');
      await page.getByRole('button', { name: 'Войти' }).click();
      await page.waitForURL(/\/#\/admin/, { timeout: 15_000 });
      await page.getByRole('heading', { name: 'Пользователи' }).waitFor({ state: 'visible', timeout: 10_000 });

      const row = page.getByRole('row', { name: new RegExp(login) });
      await expect(row).toBeVisible({ timeout: 10_000 });

      await row.getByRole('button', { name: 'Удалить' }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Cancel
      await modal.getByRole('button', { name: 'Отмена' }).click();
      await expect(modal).not.toBeVisible();

      // User should still be in the table
      await expect(row).toBeVisible();
    } finally {
      await cleanupUser(createdId);
    }
  });

  test('should hide the delete button for the current user (own row)', async ({ connectedPage: page }) => {
    await page.goto(`${BASE_URL}/#/login`);
    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForURL(/\/#\/admin/, { timeout: 15_000 });
    await page.getByRole('heading', { name: 'Пользователи' }).waitFor({ state: 'visible', timeout: 10_000 });

    // Find the row with login "admin" — that's us
    const ownRow = page.getByRole('row', { name: /^#1\s+admin/ });
    await expect(ownRow).toBeVisible({ timeout: 5_000 });

    // Should not contain a "Удалить" button (instead shows "(вы)")
    await expect(ownRow.getByRole('button', { name: 'Удалить' })).toHaveCount(0);
    await expect(ownRow).toContainText('вы');
  });

  test('backend: should return 400 when deleting self via API', async () => {
    const token = await loginAsAdmin();
    let err: any;
    try {
      // Decode id from token
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const myId = payload.sub;
      await axios.delete(`${API_URL}/users/${myId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.response?.status).toBe(400);
    expect(err.response?.data?.message).toContain('собственный аккаунт');
  });

  test('backend: should return 404 when deleting non-existent user', async () => {
    const token = await loginAsAdmin();
    let err: any;
    try {
      await axios.delete(`${API_URL}/users/999999`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.response?.status).toBe(404);
  });

  test('backend: should return 400 when deleting the last admin', async () => {
    const token = await loginAsAdmin();
    // Get current admin count and list
    const usersRes = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const admins = (usersRes.data as any[]).filter((u) => u.role === 'admin');

    if (admins.length === 1) {
      // Only one admin — try to delete them via a non-admin user.
      // We need a non-admin user to call the API.
      const tempLogin = `last-admin-test-${Date.now()}`;
      await createUser(tempLogin, 'test1234', 'user');
      const userLogin = await axios.post(`${API_URL}/auth/login`, {
        login: tempLogin,
        password: 'test1234',
      });
      const userToken = userLogin.data.access_token;

      let err: any;
      try {
        await axios.delete(`${API_URL}/users/${admins[0].id}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
      } catch (e: any) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.response?.status).toBe(400);
      expect(err.response?.data?.message).toContain('последнего администратора');

      // Cleanup the temp user
      await cleanupUser((await axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } })).data
        .filter((u: any) => u.login === tempLogin)[0]?.id);
    } else {
      test.skip(true, 'More than one admin present — last-admin case not applicable');
    }
  });
});