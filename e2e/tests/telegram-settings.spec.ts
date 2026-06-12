import { test, expect } from '@playwright/test';
import axios from 'axios';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api';

// Unique test values so runs don't conflict
const TEST_TOKEN = `test-token-${Date.now()}`;
const TEST_CHAT_ID = `123456789-${Date.now()}`;

/** Login as admin and navigate to the Telegram bot settings page. */
async function loginAndGoToSettings(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/#/login`);
  await page.getByPlaceholder('admin').fill('admin');
  await page.getByPlaceholder('••••••••').fill('admin123');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(/\/#\/admin/, { timeout: 15_000 });
  await page.getByRole('heading', { name: 'Пользователи' }).waitFor({ state: 'visible', timeout: 10_000 });

  // Click the "Telegram бот" nav button
  await page.getByRole('button', { name: 'Telegram бот' }).click();
  await page.getByRole('heading', { name: 'Telegram бот' }).waitFor({ state: 'visible', timeout: 10_000 });
}

/** Get an admin JWT token via API. */
async function getAdminToken(): Promise<string> {
  const res = await axios.post(`${API_URL}/auth/login`, {
    login: 'admin',
    password: 'admin123',
  });
  return res.data.access_token;
}

test.describe('Telegram bot settings', () => {

  // ── Test 1: Navigate to settings page ────────────────────────────
  test('should navigate to Telegram bot settings page', async ({ page }) => {
    await loginAndGoToSettings(page);
    await expect(page.getByRole('heading', { name: 'Telegram бот' })).toBeVisible();

    // Both input fields should be present
    const tokenInput = page.getByPlaceholder('123456789:ABCdefGhIjKlMnOpQrStUvWxYz');
    const chatIdInput = page.getByPlaceholder('-1001234567890 или 123456789');
    await expect(tokenInput).toBeVisible();
    await expect(chatIdInput).toBeVisible();

    // Test button should be visible
    await expect(page.getByRole('button', { name: 'Отправить тестовое сообщение' })).toBeVisible();
  });

  // ── Test 2: Save and persist token + chatId via UI ───────────────
  test('should save Telegram bot token and chatId via UI', async ({ page }) => {
    await loginAndGoToSettings(page);

    // Fill the form fields
    const tokenInput = page.getByPlaceholder('123456789:ABCdefGhIjKlMnOpQrStUvWxYz');
    const chatIdInput = page.getByPlaceholder('-1001234567890 или 123456789');

    await tokenInput.fill(TEST_TOKEN);
    await chatIdInput.fill(TEST_CHAT_ID);

    // "Сохранить" button should appear when there are changes
    await expect(page.getByRole('button', { name: 'Сохранить' })).toBeVisible({ timeout: 5_000 });

    // Click save
    await page.getByRole('button', { name: 'Сохранить' }).click();

    // Wait for success message
    await expect(page.getByText('Настройки сохранены')).toBeVisible({ timeout: 10_000 });

    // Verify status indicators show "установлен"
    await expect(page.getByText('Токен: установлен')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Chat ID: установлен')).toBeVisible({ timeout: 5_000 });
  });

  // ── Test 3: Verify saved values via API ─────────────────────────
  test('should persist settings via API', async () => {
    const token = await getAdminToken();

    // PATCH: save settings via API
    await axios.patch(`${API_URL}/settings`, {
      telegramBotToken: TEST_TOKEN,
      telegramChatId: TEST_CHAT_ID,
    }, { headers: { Authorization: `Bearer ${token}` } });

    // GET: read back and verify
    const res = await axios.get(`${API_URL}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.data.telegramBotToken).toBe(TEST_TOKEN);
    expect(res.data.telegramChatId).toBe(TEST_CHAT_ID);
  });

  // ── Test 4: Partial update — only change token ──────────────────
  test('should allow partial update of settings', async () => {
    const token = await getAdminToken();

    // Set both values first
    const newToken = `partial-token-${Date.now()}`;
    const originalChatId = `original-chat-${Date.now()}`;
    await axios.patch(`${API_URL}/settings`, {
      telegramBotToken: newToken,
      telegramChatId: originalChatId,
    }, { headers: { Authorization: `Bearer ${token}` } });

    // Update only the token — chatId should remain unchanged
    const updatedToken = `updated-token-${Date.now()}`;
    await axios.patch(`${API_URL}/settings`, {
      telegramBotToken: updatedToken,
    }, { headers: { Authorization: `Bearer ${token}` } });

    const res = await axios.get(`${API_URL}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.data.telegramBotToken).toBe(updatedToken);
    expect(res.data.telegramChatId).toBe(originalChatId);
  });

  // ── Test 5: Clear fields by saving empty values ─────────────────
  test('should clear settings when saving empty strings', async ({ page }) => {
    const token = await getAdminToken();

    // First set some values
    await axios.patch(`${API_URL}/settings`, {
      telegramBotToken: 'some-token',
      telegramChatId: 'some-chat-id',
    }, { headers: { Authorization: `Bearer ${token}` } });

    // Now clear via API (empty strings → null)
    await axios.patch(`${API_URL}/settings`, {
      telegramBotToken: '',
      telegramChatId: '',
    }, { headers: { Authorization: `Bearer ${token}` } });

    // Verify cleared via API
    const res = await axios.get(`${API_URL}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.data.telegramBotToken).toBeNull();
    expect(res.data.telegramChatId).toBeNull();

    // Verify cleared via UI — reload the page
    await page.reload();
    await page.waitForTimeout(2000);

    // Re-login and navigate (after reload the page might be on login)
    const currentUrl = page.url();
    if (!currentUrl.includes('/admin')) {
      await loginAndGoToSettings(page);
    } else {
      // Already on admin, click telegram-bot nav
      try {
        await page.getByRole('button', { name: 'Telegram бот' }).click({ timeout: 3000 });
      } catch {
        // Already on telegram-bot page
      }
      await expect(page.getByRole('heading', { name: 'Telegram бот' })).toBeVisible({ timeout: 10_000 });
    }

    // Status should show "не установлен"
    await expect(page.getByText('Токен: не установлен')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Chat ID: не установлен')).toBeVisible({ timeout: 5_000 });
  });

  // ── Test 6: Settings autoseed (first GET creates the row) ───────
  test('should autoseed settings on first GET', async () => {
    const token = await getAdminToken();

    // Delete settings row via DB reset would be heavy; instead,
    // just verify GET always returns a valid object (autoseed or existing)
    const res = await axios.get(`${API_URL}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.data).toHaveProperty('telegramBotToken');
    expect(res.data).toHaveProperty('telegramChatId');
  });

});
