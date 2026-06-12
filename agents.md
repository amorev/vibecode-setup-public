# VibeSetup UI — Agent Guide

## Architecture

**Monorepo** (npm workspaces) with Nest.js backend, Vue.js frontend, Playwright e2e tests. 

```
vibe-setup-ui/
├── apps/
│   ├── backend/          # Nest.js API (/api/auth, /api/users, /api/reminders, /api/events)
│   │   ├── src/
│   │   │   ├── main.ts                 # Entry, global prefix 'api', SPA serve
│   │   │   ├── app.module.ts           # Root module, seeds DB on startup
│   │   │   ├── database/               # SQLite/PostgreSQL TypeORM config
│   │   │   ├── auth/                   # JWT auth (login, me, password) + AdminGuard
│   │   │   │   ├── entities/admin.entity.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── admin.guard.ts      # Role check, reads role from DB
│   │   │   ├── users/                  # User CRUD (admin only)
│   │   │   └── events/                 # Public events CRUD (filters + pagination; admin-only mutations)
│   │   │       ├── entities/user.entity.ts
│   │   │       ├── users.controller.ts
│   │   │       ├── users.service.ts
│   │   │       └── users.module.ts
│   │   │   └── reminders/              # Reminder CRUD (per-user)
│   │   │       ├── entities/reminder.entity.ts
│   │   │       ├── reminders.controller.ts
│   │   │       ├── reminders.service.ts
│   │   │       ├── reminders.module.ts
│   │   │       └── dto/
│   │   │           ├── create-reminder.dto.ts
│   │   │           └── update-reminder.dto.ts
│   │   └── .env                        # DB_TYPE, DB_* settings, PORT
│   └── frontend/         # Vue 3 + Tailwind (SPA)
│       ├── src/
│       │   ├── api/auth.ts              # Axios client for auth
│       │   ├── api/users.ts             # Axios client for users
│       │   ├── api/reminders.ts         # Axios client for reminders
│       │   ├── api/events.ts            # Axios client for events
│       │   ├── components/              # Shared components
│       │   ├── views/PublicView.vue     # Public page (user count) + link to events
│       │   ├── views/LoginView.vue      # Login form
│       │   ├── views/RemindersView.vue  # Reminders list + create/edit
│       │   ├── views/EventsView.vue     # Public events list (filters + pagination)
│       │   ├── views/admin/ManageUsersView.vue  # Users CRUD
│       │   ├── views/admin/ManageEventsView.vue # Events CRUD (admin)
│       │   ├── layouts/AdminLayout.vue  # Admin layout
│       │   ├── router/index.ts          # Hash router
│       │   ├── composables/useAuth.ts   # Auth state
│       │   └── style.css                # Tailwind directives
│       ├── vite.config.ts               # proxy /api → localhost:3000
│       └── .env                         # VITE_API_BASE_URL=/
├── e2e/                    # Playwright e2e tests (remote Chrome CDP)
│   ├── fixtures.ts          # test.extend: connectedBrowser, connectedPage
│   ├── global-setup.ts      # Checks Chrome CDP, seeds DB via API
│   ├── tests/basic.spec.ts  # Login → create user → check count
│   ├── playwright.config.ts
│   └── .env                 # BROWSER_PORT, REMOTE_CHROME_HOST, E2E_*
├── docker/
│   ├── Dockerfile           # Multi-stage: frontend build → backend build → prod
│   ├── docker-compose.yml   # App + optional PostgreSQL
│   ├── docker-compose.e2e.yml  # E2E tests with Playwright UI (:8080)
│   ├── docker-compose.nginx-proxy.yml  # Prod with nginx-proxy + Let's Encrypt
│   └── env                  # Production env template
├── docs/                   # Documentation
│   ├── GETTING_STARTED.md   # Full setup guide (Docker, nginx-proxy, local)
│   ├── deployment.md        # Deploy, env vars, ports, checklists
│   ├── testing-guide.md     # Testing guide
│   ├── agents.md            # Agent quick reference
│   ├── project-overview.md  # Architecture overview
│   ├── context-index.md     # Doc index
│   └── areas/               # Area-specific docs
│       ├── backend-api-structure.md
│       ├── auth-structure.md
│       ├── database-structure.md
│       ├── frontend-structure.md
│       ├── reminders.md
│       ├── admin-panel.md
│       └── e2e-testing-structure.md
├── scripts/
│   ├── log-runner.mjs       # Runs service with logging to logs/<name>.log
│   └── kill-service.mjs     # Kills service by PID file
├── package.json             # Root workspace, all scripts
└── agents.md                # ← This file
```

## Commands

### Dev (user runs these manually)

| Command | Description |
|---------|-------------|
| `npm run dev:backend:log` | Start backend with logging → `logs/backend.log` (PID in `logs/backend.pid`) |
| `npm run dev:frontend:log` | Start frontend with logging → `logs/frontend.log` (PID in `logs/frontend.pid`) |
| `npm run kill:backend` | Kill backend and its process tree (reads `logs/backend.pid`) |
| `npm run kill:frontend` | Kill frontend and its process tree (reads `logs/frontend.pid`) |

Log files rotate at 10 MB: `backend.log` → `backend.1.log` → … → `backend.5.log` (deleted).

### Agent: DO NOT start services (default rule)

The user runs `dev:*:log` and `kill:*` commands manually. **Do NOT start backend or frontend yourself** — ask the user to run the command (e.g. `npm run dev:backend:log`) if a service needs to be running.

**Exception**: If the user explicitly asks you to start/stop a service in their message, then you may run the command yourself.

When debugging a problem, read the logs instead:
- `logs/backend.log` — current backend log
- `logs/frontend.log` — current frontend log
- `logs/backend.pid` / `logs/frontend.pid` — process IDs (if present, the service is running)

### Build & Prod

| Command | Description |
|---------|-------------|
| `npm install` | Install all workspace deps |
| `npm run build:frontend` | Build Vue → `apps/frontend/dist/` |
| `npm run build:backend` | Build Nest → `apps/backend/dist/` |
| `npm run build` | Both builds |
| `npm run start:prod` | Production (Nest serves static frontend) |
| `npm run test:e2e` | Run Playwright tests against running app |
| `npm run db:reset` | Reset DB (drop + recreate schema) |

## Environment Variables

### Backend (`apps/backend/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `DB_TYPE` | `sqlite` | `sqlite` or `postgres` |
| `DB_SQLITE_PATH` | `./data/database.sqlite` | SQLite file path |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `DB_DATABASE` | `app_db` | PostgreSQL database name |
| `PORT` | `3000` | Backend port |
| `JWT_SECRET` | `dev-secret-change-me` | **Change in production!** |
| `ADMIN_LOGIN` | `admin` | First admin (empty DB only) |
| `ADMIN_PASSWORD` | `admin` | First admin (empty DB only) |
| `CORS_ORIGIN` | `http://localhost:5173,...` | CORS allowed origins |

### Frontend (`apps/frontend/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/` | API base URL (proxy in dev, same-origin in prod) |

### E2E (`e2e/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSER_PORT` | `9222` | Chrome remote debugging port |
| `REMOTE_CHROME_HOST` | `localhost` | Chrome host for CDP |
| `E2E_BASE_URL` | `http://localhost:5173` | App URL (dev frontend port) |
| `E2E_API_URL` | `http://localhost:3000/api` | API URL for seeding |

**REMOTE_DEBUGGING_URL** is derived: `http://${REMOTE_CHROME_HOST}:${BROWSER_PORT}`

## Key Design Decisions

1. **Single container**: Frontend is built into `apps/frontend/dist/` and served by Nest.js static middleware. SPA fallback sends `index.html` for non-API routes.

2. **API prefix**: `setGlobalPrefix('api')` + `@Controller('auth')` / `@Controller('users')` / `@Controller('events')` — all API routes at `/api/*`.

3. **Database abstraction**: Two connectors (SQLite/PostgreSQL) via `DB_TYPE` env. TypeORM `synchronize: true` for auto-migration. SQLite for local/dev, PostgreSQL for production.

4. **E2E via CDP**: Tests connect to an already-running Chrome via `connectOverCDP`. No headless browser — tests run in your actual browser. Launch Chrome with `--remote-debugging-port=9222`.

5. **Playwright fixtures**: Custom `connectedBrowser` and `connectedPage` fixtures manage the CDP connection. Pages ARE closed after each test to keep the browser clean.

6. **JWT Auth**: Bearer token, 24h expiry. Guard `@UseGuards(JwtAuthGuard)` for protected routes.

7. **Role-based access**: Roles `admin` and `user`. Only `admin` can CRUD users and events (events are public-read). `AdminGuard` reads role from DB.

8. **Hash router**: Vue uses `createWebHashHistory` to avoid server-side route config for SPA.

9. **Seeding**: First admin created automatically on empty DB (from `ADMIN_LOGIN` / `ADMIN_PASSWORD` env vars).
10. **Reminders per user**: Each reminder belongs to a user (FK userId). Users can only see/edit their own reminders. Recurring reminders always shown in "upcoming" regardless of `scheduledAt`.
11. **Public Events CRUD**: Events are public-read (filters + pagination), admin-write (`JwtAuthGuard` + `AdminGuard`). AdminGuard reads role from DB.

## API Endpoints

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → `{ access_token }` |
| GET | `/api/auth/me` | Current user (JWT required) |
| PATCH | `/api/auth/password` | Change password (JWT required) |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | All users (admin only) |
| GET | `/api/users/:id` | Single user (admin only) |
| POST | `/api/users` | Create user (admin only) |
| PATCH | `/api/users/:id` | Update user (admin only) |
| DELETE | `/api/users/:id` | Delete user (admin only) |
| GET | `/api/users/count` | User count (public, no auth) |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Telegram bot settings (auto-seed) (JWT required) |
| PATCH | `/api/settings` | Update settings (JWT required) |
| POST | `/api/settings/send-test` | Send test message to Telegram (JWT required) |

### Reminders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reminders` | User's reminders (future + recurring) (JWT required) |
| GET | `/api/reminders?showPast=true` | All reminders including past (JWT required) |
| GET | `/api/reminders/:id` | Single reminder (JWT required) |
| POST | `/api/reminders` | Create reminder (JWT required) |
| PATCH | `/api/reminders/:id` | Update reminder (JWT required) |
| DELETE | `/api/reminders/:id` | Delete reminder (JWT required) |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | Paginated public list of events (filters: `title`, `description`, `dateFrom`, `dateTo`, `page`, `limit`) |
| GET | `/api/events/:id` | Single event (public) |
| POST | `/api/events` | Create event (JWT + admin required) |
| PATCH | `/api/events/:id` | Update event (JWT + admin required) |
| DELETE | `/api/events/:id` | Delete event (JWT + admin required) |

Admin-only mutations use `@UseGuards(JwtAuthGuard, AdminGuard)` — role is read from DB by `AdminGuard` (JWT payload doesn't carry role).

## Writing E2E Tests

Tests import from `../fixtures` (NOT from `@playwright/test` directly):

```typescript
import { test, expect } from '../fixtures';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api';

test('example', async ({ connectedPage }) => {
  await connectedPage.goto(`${BASE_URL}/`);
  // Use full URLs — baseURL doesn't apply with CDP connected pages
  expect(await connectedPage.locator('h1').first().textContent()).toContain('VibeSetup UI');
});
```

You do not need to run e2e test after every change. Only when user asks you

## Browser Work: Delegate to Subagent (default)

**Default rule — delegate to `browser-checker`.** All browser work (navigation, screenshots, DOM inspection, console logs, network requests, performance tracing) should be delegated to the `browser-checker` subagent via the `subagent` tool. This keeps the tool set, reporting format and console/network checks consistent across the project.

**Exception — explicit user override.** If the user **explicitly** asks you to do browser work yourself ("ты сам проверь", "без субагентов", "напрямую", "лично посмотри", "сделай сам" и т. п.), you may call `chrome_devtools_*` tools directly. This exception applies **only** when the request is unambiguous; when in doubt, delegate. When working directly, remember you only see the browser state visible to your own tools — call `list_pages` first if you need to know what is open.

```typescript
// ✅ Default — delegate to subagent
subagent({
  agent: "browser-checker",
  task: "Navigate to http://localhost:5173 and take a screenshot"
})

// ✅ Override — only when user explicitly asked you to do it yourself
//   (e.g. "посмотри сам в браузере", "без субагентов")
chrome_devtools_list_pages({})
chrome_devtools_take_screenshot({})
```

## Server Work: Delegate to Subagent

**NEVER call `mcp__ssh-connect__*` or `mcp__sftp-connect__*` tools directly.** All server operations (deploy, install packages, edit `/etc/...`, restart systemd services, run shell scripts on the remote host, check state, upload/download files) MUST be delegated via the `subagent` tool.

The project uses two project-local MCP servers, both configured in `.pi/mcp.json` and both reading credentials from the **local** (gitignored) `.env` (same `SSH_HOST/PORT/USER/PASSWORD`):

| MCP | Wrapper | Purpose | Delegated to |
|-----|---------|---------|--------------|
| `ssh-connect` | `scripts/ssh.sh` → `npx ssh-mcp` | Run shell on remote host (`ssh_connect_exec`, `ssh_connect_sudo-exec`) | `server-operator` |
| `sftp-connect` | `scripts/sftp.sh` → `npx sftp-ssh-mcp` | File transfer (`sftp_upload`, `sftp_download`, `sftp_list`) | `sftp-operator` |
| `sftp-connect` (exec) | same | `sftp_connect_exec` (shell) — **do not use**: keep all shell on `ssh-connect` for consistency | — |

**Why split:** SFTP for **data** (move files), SSH for **action** (unpack, install, restart, verify). Mixing them creates ambiguity in logs and audit. `sftp_connect_exec` exists but is intentionally avoided — it is not a primary path.

Both are the **only** allowed paths for this project — do not use the global `ssh-mcp` from `~/.pi/agent/mcp.json` even if it is connected.

```typescript
// ✅ Correct — delegate to subagent
subagent({
  agent: "server-operator",
  task: "Через ssh_connect_sudo-exec выполни: `apt-get update && apt-get install -y nginx && systemctl enable --now nginx`. Верни exit code, stdout, stderr."
})

// ✅ Correct — SFTP upload
subagent({
  agent: "sftp-operator",
  task: "Загрузи локальный файл /tmp/app.tar.gz на сервер в /home/vibecoder/app/app.tar.gz через sftp_connect_sftp_upload. Верни результат."
})

// ❌ WRONG — never call ssh-connect or sftp-connect tools directly
mcp({ tool: "ssh_connect_sudo-exec", args: "{\"command\": \"apt install nginx\"}" })
mcp({ tool: "sftp_connect_sftp_upload", args: "..." })
```

If `ssh-connect` is not connected when you try to use it, ask the user (or call) `mcp({ connect: "ssh-connect" })` first, then delegate. Same for `sftp-connect`. Do not fall back to other SSH/SFTP tools.

## Subagents

Project-local subagents (stored in `.pi/agents/`). Call with `@<name> <message>`.

| Subagent | Invoke | When to use |
|----------|--------|-------------|
| `browser-checker` | `@browser-checker проверь страницу` | **All browser work (by default)** — navigation, screenshots, console logs, DOM inspection, network analysis. Delegate to this subagent. Direct `chrome_devtools_*` calls are allowed only when the user explicitly asks you to do browser work yourself. |
| `docs-maintainer` | `@docs-maintainer обнови docs` | **After any code changes** — compares code with `docs/` and updates affected doc files. Use with a description of what changed, or without one to auto-detect drift. |
| `test-runner` | `@test-runner запусти тесты` | **Run e2e tests and return a compact report** — all tests, a specific file, or filtered by pattern. Returns pass/fail summary with error details. Does NOT fix code — only reports. |
| `test-fixer` | `@test-fixer почини тесты` | **Fix broken e2e tests** — runs the test, analyzes the error, fixes the root cause in code, re-runs, and returns the final report. Use after `test-runner` identifies failures. |
| `server-operator` | `@server-operator выполни на сервере` | **Shell on remote host** — runs commands via the project-local `ssh-connect` MCP (`ssh_connect_exec`, `ssh_connect_sudo-exec`). Use for: diagnostics, systemd, apt, ufw, log inspection, `npm ci`/`npm run build` on the server, file ops (`rm`/`mv`/`chown`) once files are on disk. Does NOT upload files — use `sftp-operator` for that. Only does what is asked, never interprets results. |
| `sftp-operator` | `@sftp-operator залей файл` | **File transfer to/from remote host** — uses the project-local `sftp-connect` MCP (`sftp_upload`, `sftp_download`, `sftp_list`). Use for: uploading tarballs, downloading logs, listing remote directories. Does NOT execute commands — `sftp_connect_exec` is intentionally avoided. Only does what is asked, never interprets results. |
| `server-deployer` | `@server-deployer разверни проект` | **Full deploy orchestrator** — coordinates SFTP upload (via `sftp-operator`) with SSH-based server actions (via `server-operator`) for first-time deploy or update. Reads `deploy/SERVER-DEPLOY.md` and returns structured per-step report. Use when user says «задеплой» / «обнови на сервере» / «разверни проект». |

### browser-checker workflow

```text
User: проверь как выглядит публичная страница
Agent: subagent({ agent: "browser-checker", task: "Navigate to http://localhost:5173, take screenshot of public page" })
Subagent: opens browser → takes screenshot → checks console → reports findings
```

### docs-maintainer workflow

```text
User: добавь новый эндпоинт POST /api/users/import
Agent: <implements the endpoint>
User: @docs-maintainer обнови docs
Subagent: reads new code → updates docs/areas/backend-api-structure.md → lists changes
```

Without a description the subagent reads the code itself and compares it with existing docs.

### test-runner workflow

```text
User: запусти e2e тесты
Agent: subagent({ agent: "test-runner", task: "Запусти все e2e тесты и верни отчёт" })
Subagent: npx playwright test → reads output → returns summary table (passed/failed/skipped with error details)
```

To run a specific test file:
```text
Agent: subagent({ agent: "test-runner", task: "Запусти tests/basic.spec.ts и верни отчёт" })
```

To filter by name:
```text
Agent: subagent({ agent: "test-runner", task: "Запусти тесты с pattern 'login' через --grep" })
```

### test-fixer workflow

```text
User: тесты падают, почини
Agent: subagent({ agent: "test-fixer", task: "Запусти все e2e тесты, найди причины падений и исправь" })
Subagent: runs test → reads error output → fixes code → re-runs → returns final report
```

The fixer runs tests, analyzes failures, fixes the root cause (in test files or application code), re-runs, and confirms everything passes. If it needs more context about business logic, it reads `agents.md` and asks clarifying questions.

### server-deployer workflow

The subagent is the **deploy orchestrator**: it knows the full flow (Node install → SFTP upload → npm ci → build → systemd → UFW → healthcheck) and runs it end-to-end. It uses `sftp-operator` for file transfer and `server-operator` for shell actions. You pass mode (`deploy` / `update` / `status`) and connection params, it returns a per-step report.

```text
User: задеплой приложение на сервер 2.26.67.89
Agent: subagent({ agent: "server-deployer", task: "Режим: deploy. Параметры: server.user=vibecoder, server.host=2.26.67.89, server.port=2091, app.path=/home/vibecoder/app, app.port=3000, service.name=vibecode-setup.service. Выполни полный цикл по deploy/SERVER-DEPLOY.md (шаги 0–9)." })
Subagent: creates tar locally → SFTP uploads → runs Node install / npm ci / build / systemd / UFW / healthcheck via SSH → returns structured report
Agent: <interprets report, reports success or escalates to user>
```

For updates, just pass `mode: "update"` and the agent skips already-done steps (Node, unit, UFW) and only re-runs SFTP upload + npm ci + build + restart.

Full step-by-step instructions and call templates live in `deploy/SERVER-DEPLOY.md` — `server-deployer` reads it automatically.

### server-operator workflow

The subagent only **executes** — it does not interpret results or decide next steps. You stay the decision-maker; it returns stdout/stderr/exit-code, you decide what to do with it.

```text
User: задеплой приложение на сервер
Agent: subagent({ agent: "server-operator", task: "Распакуй /home/vibecoder/app/app.tar.gz в /home/vibecoder/app/, выполни npm ci и npm run build, рестартни сервис. Верни результат каждой команды." })
Subagent: runs 3 commands → returns exit codes + output verbatim
Agent: <interprets output, decides next step or reports success>
```

Examples of typical tasks:

```typescript
// Read-only diagnostics
subagent({ agent: "server-operator", task: "Через ssh_connect_exec выполни: `uptime && free -h && df -h / && docker ps --format '{{.Names}}\\t{{.Status}}'`. Верни вывод." })

// System config (sudo)
subagent({ agent: "server-operator", task: "Через ssh_connect_sudo-exec добавь в /etc/ssh/sshd_config строку 'PasswordAuthentication no' (если её нет), затем выполни `sshd -t` и `systemctl reload ssh`. Верни результат." })

// Deploy script
subagent({ agent: "server-operator", task: "Через ssh_connect_sudo-exec выполни: `bash /root/setup-data/prepare-server-2.sh`. Если скрипт упадёт — остановись и верни вывод с места ошибки. Не интерпретируй." })
```

### sftp-operator workflow

Same model as `server-operator` but for **file transfer only**. Use it whenever you need to move a file (or a directory tarball) between the local machine and the remote host.

```typescript
// Upload: local → remote (most common — used by server-deployer)
subagent({ agent: "sftp-operator", task: "Загрузи локальный файл D:/work/projects/amorev/vibecode-setup-public/.tmp/release.tar.gz на сервер в /home/vibecoder/app/release.tar.gz через sftp_connect_sftp_upload. Верни результат." })

// Download: remote → local (e.g. pull a log)
subagent({ agent: "sftp-operator", task: "Скачай /home/vibecoder/app/logs/systemd-stdout.log в D:/work/projects/amorev/vibecode-setup-public/.tmp/stdout.log через sftp_connect_sftp_download. Верни результат." })

// List
subagent({ agent: "sftp-operator", task: "Выведи листинг /home/vibecoder/app/ через sftp_connect_sftp_list. Верни результат." })
```

Typical flow for a deploy update:

```text
1. server-deployer builds a tar.gz locally (its own bash)
2. → sftp-operator uploads it to /home/vibecoder/app/release.tar.gz
3. → server-operator runs SSH commands: tar -xzf, npm ci, npm run build, systemctl restart, healthcheck
4. server-deployer aggregates the per-step report
```

`server-operator` and `sftp-operator` do not call each other — the orchestrator (`server-deployer`) chains them.

Credentials live in the **local** `.env` (gitignored) and are read by `scripts/ssh.sh` and `scripts/sftp.sh`. Both wrappers exec into the corresponding MCP server (`npx ssh-mcp` and `npx sftp-ssh-mcp`). Never put credentials in `.pi/mcp.json` or in code.

## Common Issues

- **`EADDRINUSE` on port 3000**: Run `npm run kill:backend` (uses PID file) or find PID with `netstat -ano | grep :3000`
- **Frontend not served**: Must run `npm run build:frontend` first. Backend auto-detects `../frontend/dist`.
- **CDP connection fails**: Chrome must be launched with `--remote-debugging-port=9222`
- **Tests can't navigate**: Use full URLs (not relative) — `baseURL` from config doesn't apply to CDP-connected pages
- **Check logs for errors**: `logs/backend.log` and `logs/frontend.log` — agent reads these; to start/stop a service, ask the user to run `npm run dev:*:log` / `npm run kill:*` (unless the user explicitly told you to do it)
- **`ssh-connect` MCP fails to connect**: run `mcp({ connect: "ssh-connect" })` once per session. If it still fails with `Connection closed`, check that `.env` exists at the repo root with `SSH_HOST/PORT/USER/PASSWORD` and that `bash scripts/ssh.sh` starts manually. Never fall back to the global `ssh-mcp` from `~/.pi/agent/mcp.json` — this project uses only the local one.
- **`sftp-connect` MCP fails to connect**: same procedure as `ssh-connect` — `mcp({ connect: "sftp-connect" })` once per session. Uses the same `.env`. If it fails, verify `bash scripts/sftp.sh` starts manually and that `npx sftp-ssh-mcp` is available (`npm ls sftp-ssh-mcp` in repo root). Never fall back to other SFTP tools.
- **SFTP upload succeeds but file is empty on server**: usually means the local path was a directory (SFTP upload takes a single file, not a directory). Tar it up first on the local machine, then upload the tarball, then `tar -xzf` on the server via `server-operator`.
- **SHA mismatch after SFTP upload**: verify with `sha256sum` on both sides — `sftp-connect` does not compute checksums. If the server SHA differs, re-upload (do not retry via different protocol — the protocol is not the issue, the source is).
