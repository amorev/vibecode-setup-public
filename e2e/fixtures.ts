import { test as base, chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually (dotenv CJS doesn't work reliably with Playwright ESM)
function loadEnvFile(filePath: string): Record<string, string> {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const env: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    }
    return env;
  } catch {
    return {};
  }
}

const envPath = path.resolve(__dirname, '.env');
const envVars = loadEnvFile(envPath);

Object.entries(envVars).forEach(([k, v]) => {
  if (process.env[k] === undefined || process.env[k] === '') process.env[k] = v;
});

const BROWSER_MODE = process.env.E2E_BROWSER_MODE || 'cdp';
const BROWSER_PORT = process.env.BROWSER_PORT || '9222';
const REMOTE_CHROME_HOST = process.env.REMOTE_CHROME_HOST || 'localhost';
const REMOTE_DEBUGGING_URL = `http://${REMOTE_CHROME_HOST}:${BROWSER_PORT}`;
const CHROME_PATH = process.env.CHROME_PATH || '';

// Shared browser instances
let managedBrowser: Browser | null = null;
let cdpBrowser: Browser | null = null;

async function getManagedBrowser(): Promise<Browser> {
  if (managedBrowser && managedBrowser.isConnected()) {
    return managedBrowser;
  }
  const launchOpts: any = { headless: BROWSER_MODE === 'headless' };
  if (CHROME_PATH) {
    launchOpts.executablePath = CHROME_PATH;
  }
  managedBrowser = await chromium.launch(launchOpts);
  console.log(`✅ Launched ${BROWSER_MODE} browser`);
  return managedBrowser;
}

async function getCdpBrowser(): Promise<Browser> {
  if (cdpBrowser && cdpBrowser.isConnected()) {
    return cdpBrowser;
  }
  cdpBrowser = await chromium.connectOverCDP(REMOTE_DEBUGGING_URL);
  console.log(`✅ Connected to Chrome via CDP at ${REMOTE_DEBUGGING_URL}`);
  return cdpBrowser;
}

export const test = base.extend<{
  connectedBrowser: Browser;
  connectedPage: Page;
}>({
  connectedBrowser: async ({}, use) => {
    const browser = BROWSER_MODE === 'cdp'
      ? await getCdpBrowser()
      : await getManagedBrowser();
    await use(browser);
    // Don't close here — shared across tests
  },

  connectedPage: async ({ connectedBrowser }, use) => {
    const context: BrowserContext = await connectedBrowser.newContext();
    const page = await context.newPage();
    try {
      await use(page);
    } finally {
      await context.close().catch(() => {});
    }
  },
});

export { expect } from '@playwright/test';
