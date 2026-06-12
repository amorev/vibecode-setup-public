# Project Overview

## Описание

Шаблон Nest.js + Vue 3 приложения с авторизацией, админ-панелью управления пользователями и мероприятиями, настройками Telegram бота, системой напоминаний и публичным каталогом мероприятий. Публичная часть показывает текущее количество пользователей и список мероприятий (с фильтрами и пагинацией). Админ-панель (под авторизацией) позволяет управлять пользователями и мероприятиями: просматривать списки, создавать/редактировать/удалять. Также есть раздел настроек Telegram бота: сохранение токена бота, Chat ID для уведомлений, отправка тестового сообщения. Система напоминаний поддерживает одноразовые и регулярные напоминания с автоматической отправкой в Telegram через cron-сервис.

**Стек**: Nest.js + Express (backend), Vue 3 + Tailwind CSS (frontend), SQLite (dev) / PostgreSQL (prod), JWT auth, Playwright e2e tests (CDP), node-cron (отправка напоминаний в Telegram).

## Стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Бэкенд | Nest.js + Express | ^11.0.0 |
| ORM | TypeORM | ^0.3.20 |
| БД | SQLite (dev) / PostgreSQL (prod) | — |
| Фронтенд | Vue 3 + Composition API | ^3.5.0 |
| Стилизация | Tailwind CSS | ^3.4.17 |
| Маршрутизация | Vue Router (hash history) | ^4.5.0 |
| HTTP-клиент | Axios | ^1.7.0 |
| E2E-тесты | Playwright + Chrome CDP | ^1.48.0 |
| Авторизация | JWT (passport-jwt) | — |
| Сборка | Vite (frontend) + Nest CLI (backend) | — |
| Процесс-менеджер | systemd (production) | — |

## Монорепо (npm workspaces)

```
project/
├── apps/
│   ├── backend/          # Nest.js API (@Controller + TypeORM)
│   │   ├── src/auth/     # JWT auth (login, me, password) + AdminGuard
│   │   ├── src/users/    # User CRUD (admin only)
│   │   ├── src/settings/ # Telegram bot settings (token, chatId, test send)
│   │   ├── src/reminders/ # Reminders CRUD + cron → Telegram
│   │   ├── src/events/   # Public events CRUD (filters + pagination; admin-only mutations)
│   │   └── src/main.ts   # Entry, SPA fallback, CORS
│   └── frontend/         # Vue 3 SPA (Vite + Tailwind)
│       ├── src/api/      # Axios clients (auth, users, settings)
│       ├── src/views/    # PublicView, LoginView, Admin (ManageUsersView, TelegramBotView)
│       └── src/router/   # Hash router
├── e2e/                  # Playwright e2e tests (CDP)
├── deploy/
│   └── prepare/          # Скрипты подготовки сервера (запускать вручную)
├── scripts/              # Helpers: log-runner, kill-service, ssh.sh
└── package.json          # Root workspace
```

## Entry Points

| Приложение | Entry point | Описание |
|-----------|-------------|----------|
| Backend | `apps/backend/src/main.ts` | Nest.js bootstrap, SPA-fallback, CORS |
| Frontend | `apps/frontend/src/main.ts` | Vue app creation + router mount |
| E2E | `e2e/playwright.config.ts` | Playwright config (chromium-remote) |

## Архитектурные решения

1. **Единое приложение**: Frontend собирается в `dist/`, Nest.js сервит статику + API. Деплой — нативный (systemd), без контейнеризации и reverse proxy.
2. **API prefix**: `setGlobalPrefix('api')` — все API-маршруты под `/api/*`.
3. **Hash router**: `createWebHashHistory()` — SPA работает без серверного fallback.
4. **Database abstraction**: `DB_TYPE=sqlite` или `postgres` через `.env`. TypeORM `synchronize: true`.
5. **E2E через CDP**: Playwright подключается к реальному Chrome (`--remote-debugging-port=9222`), не к headless.
6. **JWT auth**: Bearer token, 24h expiry. Guard `@UseGuards(JwtAuthGuard)` для защищённых маршрутов.
7. **Role-based access**: Роли `admin` и `user`. Только `admin` может CRUD пользователей и мероприятий (мероприятия — public-read). Роль читается из БД через `AdminGuard` (JWT несёт только `sub`+`login`).
8. **Seeding**: Первый админ создаётся автоматически при пустой БД (из `ADMIN_LOGIN` / `ADMIN_PASSWORD` из env).
9. **Telegram bot settings**: Таблица `settings` — singleton, одна строка. Автосоздание при первом запросе. Сохранение токена бота, Chat ID. Тестовая отправка сообщения через Telegram Bot API (`fetch`, без доп. зависимостей).
10. **Cron-сервис напоминаний**: `RemindersService` запускает cron каждую минуту (`node-cron`). Ищет просроченные одноразовые и регулярные напоминания и отправляет в Telegram через Bot API. Отправленные помечаются `isSent=true` / `lastSent=now`.

## Порты

| Порт | Назначение |
|------|-----------|
| 3000 | Backend (Nest.js) — production и dev |
| 5173 | Frontend dev server (Vite) |
| 9222 | Chrome CDP (для e2e тестов) |

## Ключевые команды

| Команда | Описание |
|---------|----------|
| `npm install` | Все зависимости |
| `npm run dev:backend:log` | Backend с логированием |
| `npm run dev:frontend:log` | Frontend с логированием |
| `npm run build` | Обе сборки |
| `npm run start:prod` | Production (Nest + static) |
| `npm run test:e2e` | E2E тесты (последовательно, `workers=1`) |
| `npm run db:reset` | Сброс БД |
| `npm run create-admin` | CLI: создать админа |
