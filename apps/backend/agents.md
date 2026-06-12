# Backend Agent Guide

## Stack

- **Nest.js** (monorepo workspace `apps/backend`)
- **TypeORM** + SQLite (dev) / PostgreSQL (prod) — `synchronize: true`
- **class-validator** via global `ValidationPipe` (`whitelist: true`, `transform: true`)
- **JWT auth** — Bearer token, 24h expiry
- **Auto-reload:** `npm run dev:backend:log` uses `nest start --watch`
- Global API prefix: `/api`

## Entry & Config

- `src/main.ts` — bootstrap, CORS, static frontend serve (prod), SPA fallback
- `src/app.module.ts` — root module, seeds admin on `onModuleInit`
- `src/database/database.module.ts` — TypeORM config from env (`DB_TYPE`), entities listed here
- `src/auth/auth.module.ts` — JWT auth module
- `src/users/users.module.ts` — User CRUD module

## Entities

| Entity | Table | Location | Notes |
|--------|-------|----------|-------|
| `AdminEntity` | `admin` | `auth/entities/admin.entity.ts` | login (unique), passwordHash — администраторы |
| `UserEntity` | `user` | `users/entities/user.entity.ts` | login (unique), passwordHash, role (`admin`/`user`) — обычные пользователи |

## DTOs

| DTO | Location |
|-----|----------|
| `LoginDto` | `auth/dto/login.dto.ts` |
| `ChangePasswordDto` | `auth/dto/change-password.dto.ts` |
| `CreateUserDto` | `users/dto/create-user.dto.ts` |
| `UpdateUserDto` | `users/dto/update-user.dto.ts` |

All use `class-validator` decorators. Validation is enforced globally.

## API Endpoints

### Auth (`@Controller('auth')`)
- `POST /api/auth/login` — login → `{ access_token }`
- `GET /api/auth/me` — current user (JWT required)
- `PATCH /api/auth/password` — change password (JWT required)

### Users (`@Controller('users')`)
- `GET /api/users` — all users (admin only)
- `GET /api/users/count` — user count (public, **no auth**, must be BEFORE `:id` routes)
- `GET /api/users/:id` — single user (admin only)
- `POST /api/users` — create user (admin only)
- `PATCH /api/users/:id` — update user (admin only)
- `DELETE /api/users/:id` — delete user (admin only)

## Controller Routes

**Order matters:** static routes (`count`) must be **before** parameterized routes (`:id`).

## Critical Gotchas

1. **Adding entities:** new entities must be registered in **both** `database.module.ts` (entities array) **and** the feature module (TypeOrmModule.forFeature).

2. **Controller route order:** parameterized routes (`:id`) must be last — Nest.js matches routes top-to-bottom.

3. **`synchronize: true`:** schema updates automatically on restart, but no manual migrations are generated.

4. **Route guard:** `@UseGuards(JwtAuthGuard)` for all protected routes. Public routes use `@Public()` decorator.

## Env Vars

| Var | Default | Description |
|-----|---------|-------------|
| `DB_TYPE` | `sqlite` | `sqlite` or `postgres` |
| `DB_SQLITE_PATH` | `./data/database.sqlite` | SQLite file |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `DB_DATABASE` | `app_db` | PostgreSQL database |
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | `dev-secret-change-me` | JWT secret (change in prod!) |
| `ADMIN_LOGIN` | `admin` | First admin (empty DB only) |
| `ADMIN_PASSWORD` | `admin` | First admin (empty DB only) |
| `CORS_ORIGIN` | `http://localhost:5173,...` | CORS origins |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev:backend:log` | Start with watch (user runs this) |
| `npm run kill:backend` | Kill backend process tree |
| `npm run build:backend` | Build to `dist/` |
| `npm run db:reset` | Drop + recreate schema |
| `npm run create-admin` | Create additional admin via CLI |

## Logs

- `logs/backend.log` — current log (rotates at 10MB)
- `logs/backend.pid` — PID file (exists = running)
