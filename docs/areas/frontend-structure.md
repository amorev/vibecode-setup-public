# Frontend Structure

## Описание

Vue 3 SPA с Composition API, Tailwind CSS и hash router. Публичная страница (`PublicView`) показывает текущее количество пользователей и кнопку перехода к мероприятиям; отдельная публичная страница `EventsView` со списком мероприятий (фильтры + пагинация). Админка (`ManageUsersView`, `ManageEventsView`, `TelegramBotView`) — CRUD пользователей, мероприятий и настроек Telegram. Авторизация через JWT в `localStorage`.

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
| `apps/frontend/src/api/events.ts` | Axios client for events endpoints |
| `apps/frontend/src/views/PublicView.vue` | Public page (user count) |
| `apps/frontend/src/views/LoginView.vue` | Login form |
| `apps/frontend/src/views/admin/ManageUsersView.vue` | Users admin CRUD |
| `apps/frontend/src/views/admin/ManageEventsView.vue` | Events admin CRUD |
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
| `/events` | `EventsView` | No |
| `/admin` | `ManageUsersView` (via AdminLayout) | Yes |
| `/admin/events` | `ManageEventsView` (via AdminLayout) | Yes |
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

### events.ts

- `getEvents(params?)` → `PaginatedEvents` (поддерживает `title`, `description`, `dateFrom`, `dateTo`, `page`, `limit`)
- `getEvent(id)` → `Event`
- `createEvent(data)` → `Event`
- `updateEvent(id, data)` → `Event`
- `deleteEvent(id)` → `void`

Интерфейсы:
- `Event`: `{ id, title, description, link, eventDate, createdAt, updatedAt }`
- `PaginatedEvents`: `{ items: Event[], total, page, limit, totalPages }`
- `CreateEventRequest`: `{ title, description, link, eventDate }`
- `UpdateEventRequest`: все поля опциональны
- `EventsQueryParams extends EventFilters` + `page?`, `limit?`

## EventsView (публичная)

Страница `/events` — публичный список мероприятий (без авторизации).

- **Фильтры**: `title`, `description` (текстовый поиск, LIKE), `dateFrom`, `dateTo` (`<input type="date">` → ISO-строка `YYYY-MM-DD` на бэкенде)
- **Кнопки**: "Применить" (запрос с фильтрами, сброс на page=1), "Сбросить"
- **Список**: карточки-ссылки (`<a target="_blank" rel="noopener noreferrer">` на `event.link`), внутри заголовок, описание (line-clamp-3), дата/время через `toLocaleDateString('ru-RU')` и `toLocaleTimeString('ru-RU')`
- **Пустое состояние**: иконка + текст "Мероприятий не найдено"
- **Пагинация**: 10 элементов на страницу, кнопки `‹`/`›`, видимые страницы через `computed` (первая / последняя / текущая ±1), многоточия `…` по краям
- **Ссылка в `App.vue` (header)**: кнопка "Мероприятия" ведёт на `/events` (видна только авторизованным)
- **Ссылка в `PublicView`**: кнопка "Посмотреть мероприятия" → `/events`

## ManageEventsView (админ)

Страница `/admin/events` (внутри `AdminLayout`, защищена `requireAuth`). CRUD-интерфейс над теми же `GET/POST/PATCH/DELETE /api/events`.

- **Список**: те же фильтры и пагинация, что и в публичной `EventsView`
- **Создание/редактирование**: модальное окно с полями `title`, `description`, `link`, `eventDate` (дата + время раздельными `<input type="date">` / `<input type="time">` → склейка в ISO)
- **Кнопка "Редактировать"** на карточке открывает модалку с предзаполненной формой (`openEdit` через `nextTick` для корректной реактивности)
- **Удаление**: отдельная модалка подтверждения (`deletingEvent`)
- **Состояния**: `loading`, `saving`, `error`, `formError` (per-form)
- **В `AdminLayout.navItems`**: пункт "Мероприятия" → `/admin/events` (между "Пользователи" и "Telegram бот")

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
