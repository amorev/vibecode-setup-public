# Getting Started

## Что это за проект

Шаблон Nest.js + Vue 3 приложения с авторизацией, админ-панелью управления пользователями и публичной страницей. База данных: SQLite (dev) / PostgreSQL (prod).

## Быстрый старт

### 1. Клонировать и установить

```bash
git clone <repo-url>
cd <project>
npm install
```

### 2. Настройка переменных окружения

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Отредактируйте: JWT_SECRET, DB_* (если postgres)
```

### 3. Запуск в dev-режиме (локально)

```bash
# Terminal 1 — Backend с логированием
npm run dev:backend:log

# Terminal 2 — Frontend с логированием
npm run dev:frontend:log

# Terminal 3 — Chrome с CDP (для e2e тестов)
# chrome.exe --remote-debugging-port=9222   (Windows)
# google-chrome --remote-debugging-port=9222   (Linux)
```

Приложение доступно:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`

### 4. Создание первого админа

При первом запуске с пустой БД создаётся дефолтный админ (логин/пароль из `.env`): `admin` / `admin`.

Или через CLI:
```bash
npm run create-admin
```

---

## Запуск с Docker

### SQLite (dev)

```bash
cd docker
docker compose up -d
```

Приложение доступно на `http://localhost:3000`.

### PostgreSQL (prod)

```bash
cd docker

# Скопируйте env и настройте
cp env .env.production
# Отредактируйте: DB_TYPE, DB_HOST, DB_PASSWORD, JWT_SECRET, CORS_ORIGIN

docker compose -f docker-compose.yml up -d
```

> **Важно**: для production обязательно используйте PostgreSQL. SQLite не поддерживается в production.

---

## Деплой с nginx-proxy (без Docker для приложения)

### Требования

- Сервер с Node.js 22+ и npm
- nginx-proxy + letsencrypt-nginx-proxy-companion (Docker)
- Доменное имя с DNS, указывающим на IP сервера

### Шаги

#### 1. Настройте nginx-proxy (если ещё не настроен)

```bash
docker run -d \
  -p 80:80 -p 443:443 \
  -v /etc/nginx/certs:/etc/nginx/certs:rw \
  -v /etc/nginx/vhost.d \
  -v /usr/share/nginx/html \
  -v /var/run/docker.sock:/tmp/docker.sock:ro \
  -v /path/to/docker-compose.nginx-proxy.yml:/etc/nginx/docker-compose.yml \
  --name nginx-proxy \
  nginxproxy/nginx-proxy:latest

docker run -d \
  --name nginx-proxy-letsencrypt \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /etc/nginx/certs:/etc/nginx/certs:rw \
  -v /etc/nginx/vhost.d \
  -v /usr/share/nginx/html \
  --label=com.github.jrcs.letsencrypt_nginx_proxy_companion.nginx_proxy \
  nginxproxy/acme-companion:latest
```

#### 2. Разверните приложение на сервере

```bash
# Клонируйте на сервер
git clone <repo-url> /opt/app
cd /opt/app
npm install

# Соберите фронтенд и бэкенд
npm run build

# Запустите бэкенд (рекомендуется через pm2)
npm run start:prod
```

#### 3. Запустите через docker-compose с nginx-proxy

```bash
cd docker

# Настройте переменные
cp .env.example .env
# Отредактируйте: DOMAIN, EMAIL, APP_IMAGE (или build locally), PG_ROOT_PASSWORD

docker compose -f docker-compose.nginx-proxy.yml pull app
docker compose -f docker-compose.nginx-proxy.yml up -d
```

Приложение будет доступно по HTTPS на домене из `DOMAIN`.

---

## Структура проекта

```
project/
├── apps/
│   ├── backend/          # Nest.js API
│   │   ├── src/
│   │   │   ├── auth/           # JWT auth (login, me, password)
│   │   │   ├── users/          # User CRUD (admin only)
│   │   │   ├── main.ts         # Entry point
│   │   │   └── app.module.ts   # Root module
│   │   ├── .env              # Dev env
│   │   └── .env.example      # Template
│   └── frontend/         # Vue 3 SPA (Vite + Tailwind)
│       ├── src/
│       │   ├── api/            # Axios clients
│       │   ├── views/          # PublicView, LoginView, Admin
│       │   ├── router/         # Hash router
│       │   └── composables/    # useAuth
│       └── vite.config.ts
├── e2e/                  # Playwright e2e tests (CDP)
├── docker/               # Docker compose files
├── docs/                 # Документация
├── scripts/              # log-runner, kill-service
├── package.json          # Root workspace
└── agents.md             # Agent guide
```

---

## Команды

| Команда | Описание |
|---------|----------|
| `npm run dev:backend:log` | Backend с логированием → `logs/backend.log` |
| `npm run dev:frontend:log` | Frontend с логированием → `logs/frontend.log` |
| `npm run kill:backend` | Остановить backend |
| `npm run kill:frontend` | Остановить frontend |
| `npm run build` | Build frontend + backend |
| `npm run start:prod` | Production mode |
| `npm run test:e2e` | E2E тесты |
| `npm run db:reset` | Сброс БД |
| `npm run create-admin` | CLI: создать админа |

## Переменные окружения

### Backend

| Variable | Default | Описание |
|----------|---------|----------|
| `DB_TYPE` | `sqlite` | `sqlite` или `postgres` |
| `DB_SQLITE_PATH` | `./data/database.sqlite` | SQLite путь |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `DB_DATABASE` | `app_db` | PostgreSQL database |
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | `dev-secret-change-me` | **Изменить в production!** |
| `ADMIN_LOGIN` | `admin` | Первый админ (только пустая БД) |
| `ADMIN_PASSWORD` | `admin` | Первый админ (только пустая БД) |
| `CORS_ORIGIN` | `http://localhost:5173,...` | CORS allowed origins |

### E2E

| Variable | Default | Описание |
|----------|---------|----------|
| `BROWSER_PORT` | `9222` | Chrome CDP port |
| `REMOTE_CHROME_HOST` | `localhost` | Chrome host |
| `E2E_BASE_URL` | `http://localhost:5173` | App URL |
| `E2E_API_URL` | `http://localhost:3000/api` | API URL |
