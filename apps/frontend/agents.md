# Frontend Agent Guide

## Stack

- **Vue 3** (Composition API, `<script setup lang="ts">`)
- **Vite** (monorepo workspace `apps/frontend`)
- **Tailwind CSS**
- **Axios** (API client)
- **Vue Router** (`createWebHashHistory`)
- **Auto-reload:** `npm run dev:frontend:log` uses `vite`

## Structure

```
src/
├── App.vue                    # Root: header + router-view
├── api/
│   ├── auth.ts                # Axios client + auth API functions
│   └── users.ts               # Users API functions
├── composables/
│   ├── useAuth.ts             # Auth state (login/logout/checkAuth)
│   └── useTheme.ts            # Dark/light theme toggle
├── layouts/
│   └── AdminLayout.vue        # Admin panel layout (sidebar + header)
├── router/
│   └── index.ts               # Hash router
├── views/
│   ├── PublicView.vue         # Public page (user count + text)
│   ├── LoginView.vue          # Login form
│   └── admin/
│       └── ManageUsersView.vue  # Users CRUD (admin only)
└── style.css                  # Tailwind directives
```

## Routes

| Path | Component | Auth Required | Description |
|------|-----------|---------------|-------------|
| `/` | `PublicView.vue` | No | Public page — user count + info text |
| `/login` | `LoginView.vue` | No (guest only) | Login form |
| `/admin/users` | `ManageUsersView.vue` | Yes | Users CRUD (admin only) |

Router guard: `beforeEnter: requireAuth` redirects to `/login` if no `auth_token` in localStorage.

## Components

### App.vue (Root)
- Sticky header with app title + login/admin buttons
- Theme toggle (light/dark/system)
- `<router-view />` for page rendering

### PublicView.vue
- Shows user count from `GET /api/users/count`
- Static info text (template + hero text configurable from settings)
- Loading and error states

### LoginView.vue
- Two-column layout (branding + form)
- Uses `useAuth().login()` composable
- Redirects to `/admin/users` on success

### AdminLayout.vue
- Sidebar navigation + page header
- Children: ManageUsersView

### ManageUsersView.vue
- Users table (login, role, created, actions)
- Create user modal (form: login, password, role)
- Delete user (confirm dialog)
- Role: admin / user

## API Clients

### `api/auth.ts`
- **Axios instance** — base URL from `VITE_API_BASE_URL` (default `/`), auto-attaches JWT token
- **Functions:**
  - `login(data)` → `{ access_token }`
  - `getMe()` → current user info

### `api/users.ts`
- **Functions:**
  - `getUsers()` → all users
  - `getUserCount()` → count (public)
  - `createUser(data)` → create user
  - `updateUser(id, data)` → update user
  - `deleteUser(id)` → delete user

## Critical Gotchas

1. **Date formatting:** Never use `date.toISOString().split('T')[0]` for local dates — it converts to UTC and shifts the date back by timezone offset.

2. **HTTP caching:** The Vite dev proxy caches GET responses with ETags. Always include `Cache-Control: no-cache` in axios headers (already configured in the default instance).

3. **Hash router:** URLs look like `/#/`. No SPA fallback needed in dev (Vite handles it).

4. **Auth token:** Stored in `localStorage` as `auth_token`. Checked by `requireAuth` guard before admin routes.

## Env Vars

| Var | Default | Description |
|-----|---------|-------------|
| `VITE_API_BASE_URL` | `/` | API base URL (proxy in dev, same-origin in prod) |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev:frontend:log` | Start Vite dev server (user runs this) |
| `npm run kill:frontend` | Kill frontend process tree |
| `npm run build:frontend` | Build to `dist/` (runs `vue-tsc -b && vite build`) |

## Logs

- `logs/frontend.log` — current log (rotates at 10MB)
- `logs/frontend.pid` — PID file (exists = running)
