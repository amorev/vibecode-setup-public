import { test, expect } from '@playwright/test';
import axios from 'axios';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api';

// Unique user name for this test run (avoids conflicts with previous runs)
const TEST_USER_LOGIN = `test-user-${Date.now()}`;

test.describe('Basic smoke tests', () => {

  // ── Test 1: Login to admin panel ──────────────────────────────────
  test('should login to admin panel and redirect to users page', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/login`);
    await page.getByPlaceholder('admin').waitFor({ state: 'visible', timeout: 10_000 });

    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: 'Войти' }).click();

    // Wait for redirect to admin/users page
    await page.waitForURL(/\/#\/admin/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Пользователи' })).toBeVisible({ timeout: 10_000 });

    // Verify login succeeded — auth token should be stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
  });

  // ── Test 2: Create a new user via UI ──────────────────────────────
  test('should create a new user', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/#/login`);
    await page.getByPlaceholder('admin').fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForURL(/\/#\/admin/, { timeout: 15_000 });
    await page.getByRole('heading', { name: 'Пользователи' }).waitFor({ state: 'visible', timeout: 10_000 });

    // Click "Создать пользователя" button
    await page.getByRole('button', { name: 'Создать пользователя' }).click();

    // Fill the form with unique user name
    await page.getByPlaceholder('username').fill(TEST_USER_LOGIN);
    await page.getByPlaceholder('Минимум 4 символа').fill('test1234');
    await page.getByRole('button', { name: 'Создать' }).click();

    // Verify user appears in the table (exact match in a table cell)
    await expect(page.getByRole('cell', { name: TEST_USER_LOGIN, exact: true })).toBeVisible({ timeout: 10_000 });
  });

  // ── Test 3: Public page shows user count ─────────────────────────
  test('should show user count on public page', async ({ page }) => {
    // Create a test user via API (direct axios call)
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      login: 'admin',
      password: 'admin123',
    });
    const token = loginRes.data.access_token;

    try {
      await axios.post(`${API_URL}/users`, {
        login: `test-user-public-${Date.now()}`,
        password: 'test1234',
        role: 'user',
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      // Ignore if user already exists
    }

    // Navigate to public page
    await page.goto(`${BASE_URL}/#/`);
    await page.waitForSelector('text=Всего пользователей', { timeout: 10_000 });

    // Find the big number (user count) — it's in a text-5xl element
    const countElements = await page.locator('[class*="text-5xl"]').allTextContents();
    const count = parseInt(countElements[0] || '0', 10);
    expect(count).toBeGreaterThan(0);
  });

});
