# VibeSetup UI — Agent Guide

## Architecture

**Monorepo** (npm workspaces) with Nest.js backend, Vue.js frontend, Playwright e2e tests. Single Docker container in production — frontend built into Nest.js static.

```
vibe-setup-ui/
├── apps/
│   ├── backend/          # Nest.js API (/api/auth, /api/users, /api/reminders)
│   │   ├── src/
│   │   │   ├── main.ts                 # Entry, global prefix 'api', SPA serve
│   │   │   ├── app.module.ts           # Root module, seeds DB on startup
│   │   │   ├── database/               # SQLite/PostgreSQL TypeORM config
│   │   │   ├── auth/                   # JWT auth (login, me, password)
│   │   │   │   ├── entities/admin.entity.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   └── users/                  # User CRUD (admin only)
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
│       │   ├── components/              # Shared components
│       │   ├── views/PublicView.vue     # Public page (user count)
│       │   ├── views/LoginView.vue      # Login form
│       │   ├── views/RemindersView.vue  # Reminders list + create/edit
│       │   ├── views/admin/ManageUsersView.vue  # Users CRUD
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

2. **API prefix**: `setGlobalPrefix('api')` + `@Controller('auth')` / `@Controller('users')` — all API routes at `/api/*`.

3. **Database abstraction**: Two connectors (SQLite/PostgreSQL) via `DB_TYPE` env. TypeORM `synchronize: true` for auto-migration. SQLite for local/dev, PostgreSQL for production.

4. **E2E via CDP**: Tests connect to an already-running Chrome via `connectOverCDP`. No headless browser — tests run in your actual browser. Launch Chrome with `--remote-debugging-port=9222`.

5. **Playwright fixtures**: Custom `connectedBrowser` and `connectedPage` fixtures manage the CDP connection. Pages ARE closed after each test to keep the browser clean.

6. **JWT Auth**: Bearer token, 24h expiry. Guard `@UseGuards(JwtAuthGuard)` for protected routes.

7. **Role-based access**: Roles `admin` and `user`. Only `admin` can CRUD users.

8. **Hash router**: Vue uses `createWebHashHistory` to avoid server-side route config for SPA.

9. **Seeding**: First admin created automatically on empty DB (from `ADMIN_LOGIN` / `ADMIN_PASSWORD` env vars).
10. **Reminders per user**: Each reminder belongs to a user (FK userId). Users can only see/edit their own reminders. Recurring reminders always shown in "upcoming" regardless of `scheduledAt`.

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

## Docker

```bash
# Production (single container)
cd docker && docker compose up -d

# With PostgreSQL
DB_TYPE=postgres docker compose -f docker-compose.yml up -d

# E2E tests (Playwright UI on :8080)
cd docker && docker compose -f docker-compose.e2e.yml up e2e

# Production with nginx-proxy (HTTPS, Let's Encrypt)
cd docker && cp .env.example .env
# Edit: DOMAIN, EMAIL, APP_IMAGE, PG_ROOT_PASSWORD
docker compose -f docker-compose.nginx-proxy.yml pull app
docker compose -f docker-compose.nginx-proxy.yml up -d
```

Dockerfile is multi-stage:
1. **frontend-builder**: Install frontend deps, `npm run build:frontend`
2. **backend-builder**: Install backend deps, `npm run build:backend`
3. **production**: Only prod deps + built artifacts from stages 1-2

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

## Browser Work: Delegate to Subagent

**NEVER call `chrome_devtools_*` tools directly.** All browser work (navigation, screenshots, DOM inspection, console logs, network requests, performance tracing) MUST be delegated to the `browser-checker` subagent via the `subagent` tool.

```typescript
// ✅ Correct — delegate to subagent
subagent({
  agent: "browser-checker",
  task: "Navigate to http://localhost:5173 and take a screenshot"
})

// ❌ WRONG — never call chrome_devtools_* directly
chrome_devtools_navigate_page({ url: "http://localhost:5173" })
```

## Subagents

Project-local subagents (stored in `.pi/agents/`). Call with `@<name> <message>`.

| Subagent | Invoke | When to use |
|----------|--------|-------------|
| `browser-checker` | `@browser-checker проверь страницу` | **All browser work** — navigation, screenshots, console logs, DOM inspection, network analysis. Never call chrome_devtools_* tools yourself; delegate to this subagent. |
| `docs-maintainer` | `@docs-maintainer обнови docs` | **After any code changes** — compares code with `docs/` and updates affected doc files. Use with a description of what changed, or without one to auto-detect drift. |
| `test-runner` | `@test-runner запусти тесты` | **Run e2e tests and return a compact report** — all tests, a specific file, or filtered by pattern. Returns pass/fail summary with error details. Does NOT fix code — only reports. |
| `test-fixer` | `@test-fixer почини тесты` | **Fix broken e2e tests** — runs the test, analyzes the error, fixes the root cause in code, re-runs, and returns the final report. Use after `test-runner` identifies failures. |

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

## Common Issues

- **`EADDRINUSE` on port 3000**: Run `npm run kill:backend` (uses PID file) or find PID with `netstat -ano | grep :3000`
- **Frontend not served**: Must run `npm run build:frontend` first. Backend auto-detects `../frontend/dist`.
- **CDP connection fails**: Chrome must be launched with `--remote-debugging-port=9222`
- **Tests can't navigate**: Use full URLs (not relative) — `baseURL` from config doesn't apply to CDP-connected pages
- **Check logs for errors**: `logs/backend.log` and `logs/frontend.log` — agent reads these; to start/stop a service, ask the user to run `npm run dev:*:log` / `npm run kill:*` (unless the user explicitly told you to do it)
