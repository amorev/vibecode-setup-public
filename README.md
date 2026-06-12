# VibeSetup UI — Шаблон Nest.js + Vue 3 приложения

Шаблон с авторизацией, админ-панелью управления пользователями и публичной страницей.

> **🤖 Для AI-агентов**: Если вы ИИ-агент и ваша задача — развернуть этот проект на сервере пользователя, читайте [readme-for-agents.md](readme-for-agents.md). Этот файл содержит пошаговые инструкции по клонированию, установке, настройке и запуску приложения через Node.js (без Docker).

## Структура

```
vibe-setup-ui/
├── apps/
│   ├── backend/          # Nest.js API (/api/auth, /api/users)
│   └── frontend/         # Vue 3 + Tailwind (SPA)
├── e2e/                  # Playwright e2e-тесты (CDP)
├── docker/               # Dockerfile + compose-файлы
├── docs/                 # Документация
├── scripts/              # log-runner, kill-service
└── package.json          # Root workspace (npm workspaces)
```

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск dev-серверов (backend на :3000, frontend на :5173)
npm run dev

# Отдельные команды (с логированием)
npm run dev:backend:log   # Backend → logs/backend.log
npm run dev:frontend:log  # Frontend → logs/frontend.log
```

## Сборка и продакшн

```bash
# Сборка (frontend → dist, backend → dist)
npm run build

# Запуск production (один контейнер, frontend сервится из Nest)
npm run start:prod
```

## Docker

```bash
# Production (single container + опциональный PostgreSQL)
cd docker
docker compose up -d

# E2E-тесты в Docker
cd docker
docker compose -f docker-compose.e2e.yml up --abort-on-container-exit
```

## E2E-тесты

Тесты запускаются последовательно (`workers=1`), используют Chrome CDP.

```bash
# Перед запуском — Chrome с CDP:
chrome.exe --remote-debugging-port=9222

# Запуск всех тестов
npm run test:e2e

# Один файл
npm run test:e2e -- e2e/tests/basic.spec.ts

# UI mode
npm run test:e2e:ui
```

## База данных

**SQLite** (dev): `apps/backend/data/database.sqlite`
**PostgreSQL** (prod): настройка в `.env`

```
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=app_db
```

## API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/auth/login` | Авторизация → `{ access_token }` |
| GET | `/api/auth/me` | Текущий пользователь |
| PATCH | `/api/auth/password` | Смена пароля |
| GET | `/api/users` | Все пользователи (admin) |
| POST | `/api/users` | Создать пользователя (admin) |
| PATCH | `/api/users/:id` | Обновить пользователя (admin) |
| DELETE | `/api/users/:id` | Удалить пользователя (admin) |
| GET | `/api/users/count` | Количество пользователей (public) |

## Документация

- [GETTING_STARTED.md](docs/GETTING_STARTED.md) — запуск с нуля (Docker, nginx-proxy)
- [deployment.md](docs/deployment.md) — деплой, переменные окружения
- [testing-guide.md](docs/testing-guide.md) — руководство по тестированию
- [agents.md](docs/agents.md) — сводка для субагентов
- [areas/backend-api-structure.md](docs/areas/backend-api-structure.md) — Backend API
- [areas/frontend-structure.md](docs/areas/frontend-structure.md) — Frontend структура
- [areas/database-structure.md](docs/areas/database-structure.md) — База данных
- [areas/auth-structure.md](docs/areas/auth-structure.md) — Аутентификация
