import axios from 'axios';
import { spawnSync, spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually (dotenv CJS doesn't work reliably with Playwright ESM)
function loadEnvFile(filePath: string): Record<string, string> {
  try {
    const content = readFileSync(filePath, 'utf8');
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

const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api';

async function waitForBackend(maxRetries = 30, delay = 1000): Promise<boolean> {
  console.log('   Waiting for backend...');
  for (let i = 0; i < maxRetries; i++) {
    try {
      await axios.get(`${API_URL}/users/count`);
      console.log('✅ Backend is ready.');
      return true;
    } catch {
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('⚠️  Backend did not become ready after 30s.');
  return false;
}

async function globalSetup() {
  // For CDP mode: check or launch Chrome
  if (BROWSER_MODE === 'cdp') {
    console.log(`Checking Chrome CDP at ${REMOTE_DEBUGGING_URL}...`);
    try {
      const res = await axios.get(`${REMOTE_DEBUGGING_URL}/json/version`);
      console.log(`Chrome found: ${res.data['Browser']}`);
    } catch {
      if (CHROME_PATH) {
        console.log(`Chrome not reachable — launching via CHROME_PATH=${CHROME_PATH}...`);
        try {
          execSync(
            `"${CHROME_PATH}" --remote-debugging-port=${BROWSER_PORT} --no-first-run --no-default-browser-check about:blank`,
            { stdio: 'inherit', shell: process.platform === 'win32' },
          );
          await new Promise(r => setTimeout(r, 3000));
          const res = await axios.get(`${REMOTE_DEBUGGING_URL}/json/version`);
          console.log(`Chrome launched: ${res.data['Browser']}`);
        } catch (launchErr: any) {
          console.warn(`Failed to launch Chrome: ${launchErr.message}`);
        }
      } else {
        console.warn(`Chrome not reachable at ${REMOTE_DEBUGGING_URL} — make sure it's started with --remote-debugging-port=${BROWSER_PORT}`);
      }
    }
  } else {
    console.log(`Using ${BROWSER_MODE} mode — Playwright will manage the browser.`);
  }

  // Find project root
  let projectRoot = process.cwd();
  while (projectRoot !== '/') {
    try {
      const pkgPath = path.resolve(projectRoot, 'package.json');
      const data = readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(data);
      if (pkg.name === 'vibe-setup-ui') break;
    } catch {
      // not a package.json, go up
    }
    projectRoot = path.resolve(projectRoot, '..');
  }

  console.log('Resetting database for e2e tests...');
  console.log('   Project root:', projectRoot);

  // Check if backend is already running
  let backendAlreadyRunning = false;
  try {
    await axios.get(`${API_URL}/users/count`, { timeout: 2000 });
    backendAlreadyRunning = true;
    console.log('   Backend already running — skipping db:reset.');
  } catch {
    // Backend not running
  }

  if (!backendAlreadyRunning) {
    const resetResult = spawnSync('npm', ['run', 'db:reset'], {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 30000,
      shell: process.platform === 'win32',
    });

    if (resetResult.status === 0) {
      console.log('Database reset (all tables dropped and recreated).');
    } else {
      const stderr = resetResult.stderr?.toString?.() || String(resetResult.stderr);
      const stdout = resetResult.stdout?.toString?.() || String(resetResult.stdout);
      console.error('Could not reset DB:', stderr);
      console.error('   stdout:', stdout);
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  // Start backend if it wasn't already running
  if (!backendAlreadyRunning) {
    console.log('   Starting backend via npm run start:dev...');
    const bp = spawn('npm', ['run', 'start:dev', '--workspace=apps/backend'], {
      cwd: projectRoot,
      stdio: 'ignore',
      shell: process.platform === 'win32',
      detached: true,
    });
    bp.unref();
    console.log(`   Backend process started (pid: ${bp.pid}).`);
  }

  // Wait for backend to be ready
  const backendReady = await waitForBackend();
  if (!backendReady) {
    console.warn('⚠️  Backend not ready — seeding will likely fail.');
  }

  // Seed admin user for e2e tests.
  // The backend auto-seeds admin on startup, but let's ensure admin123 is set as password.
  try {
    const passwords = ['admin123', 'admin', 'password', 'Password1', 'admin1234'];
    let normalized = false;

    for (const pwd of passwords) {
      try {
        const token = (await axios.post(`${API_URL}/auth/login`, {
          login: 'admin',
          password: pwd,
        })).data.access_token;

        if (pwd !== 'admin123') {
          await axios.patch(
            `${API_URL}/auth/password`,
            {
              currentPassword: pwd,
              newPassword: 'admin123',
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          console.log(`Admin password normalized from "${pwd}" to "admin123".`);
        } else {
          console.log('Admin password already set to admin123.');
        }

        normalized = true;
        break;
      } catch {
        continue;
      }
    }

    if (!normalized) {
      console.warn('Could not normalize admin password — e2e tests may fail');
    }
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string }; status?: number }; message?: string })?.response?.data?.message || (err as { message?: string })?.message || 'unknown error';
    console.error('Could not normalize admin password:', msg);
  }
}

export default globalSetup;
