/**
 * Runs a child command and writes stdout/stderr to a rotating log file.
 *
 * Usage: node scripts/log-runner.mjs <name> <command> [args...]
 *   name    — log file stem, e.g. "backend" or "frontend"
 *   command — program to execute
 *   args    — forwarded to the child process
 *
 * Logs go to logs/<name>.log (current), old ones rotated:
 *   <name>.1.log, <name>.2.log, …  (max 5 files, 10 MB each)
 */
import { spawn } from 'child_process';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  statSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  readFileSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, '..', 'logs');

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

function rotateLog(name) {
  const currentPath = join(LOG_DIR, `${name}.log`);
  try {
    if (!existsSync(currentPath)) return;
    if (statSync(currentPath).size < MAX_SIZE) return;
  } catch {
    return;
  }

  // Shift: .N.log → .(N+1).log, drop beyond MAX_FILES
  for (let i = MAX_FILES; i >= 1; i--) {
    const src = join(LOG_DIR, `${name}.${i}.log`);
    const dst = join(LOG_DIR, `${name}.${i + 1}.log`);
    if (existsSync(src)) {
      if (i + 1 > MAX_FILES) {
        unlinkSync(src);
      } else {
        renameSync(src, dst);
      }
    }
  }
  renameSync(currentPath, join(LOG_DIR, `${name}.1.log`));

  // Open fresh stream for the new current file
  const freshStream = createWriteStream(currentPath, { flags: 'w' });
  freshStream.write(`[ROTATED] ${new Date().toISOString()}\n`);
  return freshStream;
}

function ensureDir() {
  mkdirSync(LOG_DIR, { recursive: true });
}

// ── Main ──────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node log-runner.mjs <name> <command> [args...]');
  process.exit(1);
}

const name = args[0];
const command = args[1];
const spawnArgs = args.slice(2);

ensureDir();

const logPath = join(LOG_DIR, `${name}.log`);
let stream = createWriteStream(logPath, { flags: 'a' });

writeFileSync(logPath, `[STARTED] ${new Date().toISOString()} — ${command} ${spawnArgs.join(' ')}\n`, { flag: 'a' });

const child = spawn(command, spawnArgs, {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env },
  // On Linux: detach from parent process group so signals don't cascade
  // On Windows: this is ignored but harmless
});

function writeWithRotation(text) {
  stream.write(text + '\n');
  // Check if rotation is needed after each write
  try {
    if (existsSync(logPath) && statSync(logPath).size >= MAX_SIZE) {
      const newStream = rotateLog(name);
      if (newStream) {
        stream.end();
        stream = newStream;
        stream.write(text + '\n');
      }
    }
  } catch {
    // ignore stats errors during rotation
  }
}

function timestamp(data) {
  return data
    .toString()
    .split(/\r?\n/)
    .map(line => `[${new Date().toISOString()}] ${line}`)
    .join('\n');
}

child.stdout.on('data', (data) => {
  const text = timestamp(data);
  process.stdout.write(text + '\n');
  writeWithRotation(text);
});

child.stderr.on('data', (data) => {
  const text = timestamp(data);
  process.stderr.write(text + '\n');
  writeWithRotation(text);
});

// Write PID file so the wrapper and child can be killed later
const pidPath = join(LOG_DIR, `${name}.pid`);
writeFileSync(pidPath, String(child.pid));

function cleanup() {
  console.log(`\n[LOG-RUNNER] Shutting down ${name} (child pid=${child.pid})...`);
  try {
    // Try graceful SIGINT first
    child.kill('SIGINT');
  } catch {
    // Child already gone
  }
  // Give it 3 seconds, then force kill
  setTimeout(() => {
    try {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    } catch {}
    writeFileSync(logPath, `\n[STOPPED] ${new Date().toISOString()}\n`, { flag: 'a' });
    stream.end();
    try { unlinkSync(pidPath); } catch {}
    process.exit(0);
  }, 3000);
}

child.on('close', (code) => {
  writeFileSync(logPath, `\n[STOPPED] ${new Date().toISOString()} — exit code ${code}\n`, { flag: 'a' });
  stream.end();
  try { unlinkSync(pidPath); } catch {}
  process.exit(code ?? 0);
});

// Cross-platform signal handling
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGBREAK', cleanup); // Windows Ctrl+Break / Task Manager kill
process.on('exit', () => {
  try { child.kill('SIGINT'); } catch {}
  try { unlinkSync(pidPath); } catch {}
});
