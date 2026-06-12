/**
 * Kills a service started by log-runner.mjs
 *
 * Usage: node scripts/kill-service.mjs <name>
 *   name — "backend" or "frontend"
 *
 * Reads logs/<name>.pid, kills the process and its tree.
 */
import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, '..', 'logs');

const name = process.argv[2];
if (!name) {
  console.error('Usage: node kill-service.mjs <backend|frontend>');
  process.exit(1);
}

const pidPath = join(LOG_DIR, `${name}.pid`);
if (!existsSync(pidPath)) {
  console.log(`No PID file found for '${name}' (not running?)`);
  process.exit(0);
}

const pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);
if (isNaN(pid)) {
  console.error(`Invalid PID in ${pidPath}`);
  unlinkSync(pidPath);
  process.exit(1);
}

console.log(`Killing ${name} (pid=${pid}) and its tree...`);
try {
  // /T = tree, /F = force
  execSync(`taskkill /T /F /PID ${pid}`, { stdio: 'inherit' });
  console.log(`Done. '${name}' stopped.`);
} catch (err) {
  // Process might already be dead
  console.log(`Process ${pid} may already be stopped.`);
} finally {
  try { unlinkSync(pidPath); } catch {}
}
