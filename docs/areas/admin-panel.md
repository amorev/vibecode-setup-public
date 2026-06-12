# Admin Panel

## Описание

Защищённая маршрутами часть приложения. AdminLayout с навигацией, ManageUsersView для CRUD пользователей, ManageEventsView для CRUD мероприятий, TelegramBotView для настроек Telegram-бота.

## Ключевые файлы

| Файл | Роль |
|------|------|
| `apps/frontend/src/layouts/AdminLayout.vue` | Admin layout with nav links |
| `apps/frontend/src/views/admin/ManageUsersView.vue` | Users CRUD table |
| `apps/frontend/src/views/admin/ManageEventsView.vue` | Events CRUD (filters + pagination + edit modal) |
| `apps/frontend/src/views/admin/TelegramBotView.vue` | Telegram bot settings page |

## Маршруты

| Path | Component |
|------|-----------|
| `/admin` | ManageUsersView |
| `/admin/events` | ManageEventsView |
| `/admin/telegram-bot` | TelegramBotView |

## Guard

Route guard в `router/index.ts` (`requireAuth`) проверяет `localStorage.getItem('auth_token')` на роутах `/reminders` и `/admin/*` (включая `/admin/events`). Без токена — redirect на `/login`.

## Common issues

1. **Admin button not visible**: not authenticated, check `localStorage`
2. **Redirect loop**: token expired but router guard didn't clear it
