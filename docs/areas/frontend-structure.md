# Frontend Structure

## Описание

Vue 3 SPA с Composition API, Tailwind CSS и hash router. Публичная страница (`PublicView`) показывает текущее количество пользователей. Админка (`UsersAdminView`) — CRUD пользователей. Авторизация через JWT в `localStorage`.

## Ключевые файлы

| Файл | Роль |
|------|------|
| `apps/frontend/src/main.ts` | Vue app creation + router mount |
| `apps/frontend/src/App.vue` | Root component: header with nav + router-view |
| `apps/frontend/src/router/index.ts` | Hash router: public + auth routes |
| `apps/frontend/src/api/auth.ts` | Axios client for auth endpoints |
| `apps/frontend/src/api/users.ts` | Axios client for users endpoints |
| `apps/frontend/src/api/settings.ts` | Axios client for settings endpoints |
| `apps/frontend/src/api/reminders.ts` | Axios client for reminders endpoints |
| `apps/frontend/src/views/PublicView.vue` | Public page (user count) |
| `apps/frontend/src/views/LoginView.vue` | Login form |
| `apps/frontend/src/views/admin/ManageUsersView.vue` | Users admin CRUD |
| `apps/frontend/src/views/admin/TelegramBotView.vue` | Telegram bot settings page |
| `apps/frontend/src/views/RemindersView.vue` | Reminders list + create/edit modal |
| `apps/frontend/src/layouts/AdminLayout.vue` | Admin layout with nav |
| `apps/frontend/src/composables/useAuth.ts` | Auth state: login/logout/checkAuth |
| `apps/frontend/src/style.css` | Tailwind directives |

## Роуты

| Path | Component | Auth required |
|------|-----------|---------------|
| `/` | `PublicView` | No |
| `/login` | `LoginView` | No |
| `/admin` | `ManageUsersView` (via AdminLayout) | Yes |
| `/admin/telegram-bot` | `TelegramBotView` (via AdminLayout) | Yes |
| `/reminders` | `RemindersView` | Yes |

## API Clients

### auth.ts

- `login(login, password)` → `{ access_token }`
- `getMe(token)` → `{ id, login }`

### users.ts

- `getUsers()` → `PublicUser[]`
- `createUser(data)` → `PublicUser`
- `updateUser(id, data)` → `PublicUser`
- `deleteUser(id)` → `void`
- `getUserCount()` → `{ total, adminCount }` (public, no auth)

### settings.ts

- `getSettings()` → `{ telegramBotToken, telegramChatId }`
- `updateSettings(data)` → `{ telegramBotToken, telegramChatId }`
- `sendTestMessage()` → `{ ok, message }`

### reminders.ts

- `getReminders(showPast?)` → `Reminder[]` (showPast=false по умолчанию)
- `getReminder(id)` → `Reminder`
- `createReminder(data)` → `Reminder`
- `updateReminder(id, data)` → `Reminder`
- `deleteReminder(id)` → `void`
- `toggleReminders(ids, enabled)` → `void` (массовое включение/выключение)

Интерфейсы:
- `Reminder`: `{ id, userId, text, scheduledAt, isRecurring, weekdays, isSent, lastSent, createdAt, updatedAt }`
- `CreateReminderRequest`: `{ text, scheduledAt, isRecurring?, weekdays? }`
- `UpdateReminderRequest`: `{ text?: string, scheduledAt?: string, isRecurring?: boolean, weekdays?: number[] }`

## RemindersView

Страница `/reminders` — управление напоминаниями текущего пользователя:
- **Список**: будущие одноразовые + все регулярные напоминания. Чекбокс "Показать прошедшие" показывает все
- **Создание/редактирование**: модальное окно с полями текст, дата, время, чекбокс "Регулярное", кнопки дней недели (Пн-Вс)
- **Удаление**: кнопка при наведении на карточку напоминания
- **Форматирование**: даты через `Intl.DateTimeFormat('ru-RU')`, время HH:mm, дни недели как "Пн, Вт, Ср"
- **Редактирование**: `openEdit()` использует `nextTick()` для корректной реактивности weekdays при `v-show`

## Auth Flow

1. User enters credentials → `POST /api/auth/login`
2. Token saved to `localStorage('auth_token')`
3. `useAuth()` composable provides: `token`, `user`, `login()`, `logout()`, `checkAuth()`
4. Axios interceptor attaches `Authorization: Bearer <token>` automatically
5. Route guard redirects unauthenticated users to `/login`

## Common issues

1. **Hash router**: URLs use `#` (e.g. `http://localhost:5173/#/admin`)
2. **Token not attached**: check axios interceptor in `api/auth.ts`
3. **401 on protected routes**: token expired (24h), re-login
