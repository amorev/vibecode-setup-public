# Admin Panel

## Описание

Защищённая маршрутами часть приложения. AdminLayout с навигацией, ManageUsersView для CRUD пользователей.

## Ключевые файлы

| Файл | Роль |
|------|------|
| `apps/frontend/src/layouts/AdminLayout.vue` | Admin layout with nav links |
| `apps/frontend/src/views/admin/ManageUsersView.vue` | Users CRUD table |

## Маршруты

| Path | Component |
|------|-----------|
| `/admin` | ManageUsersView |

## Guard

Route guard в `router/index.ts` проверяет `localStorage.getItem('auth_token')`. Без токена — redirect на `/login`.

## Common issues

1. **Admin button not visible**: not authenticated, check `localStorage`
2. **Redirect loop**: token expired but router guard didn't clear it
