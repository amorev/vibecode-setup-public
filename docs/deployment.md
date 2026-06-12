# Deployment

## Обзор

Приложение упаковывается в **один Docker-контейнер** (multi-stage build). Frontend собирается в статику и сервится Nest.js. Бэкенд и фронтенд не имеют отдельных контейнеров.

## Dockerfile (multi-stage)

```
Stage 1 (frontend-builder):  npm install + npm run build:frontend
Stage 2 (backend-builder):   npm install (prod) + npm run build:backend
Stage 3 (production):        prod deps + artifacts from 1+2
```

### Что копируется в production

| Источник | Путь в контейнере |
|----------|------------------|
| Stage 2 | `apps/backend/dist/` |
| Stage 1 | `apps/frontend/dist/` |

**Важно**: `apps/backend/.env` **не** копируется в production — env переопределяется через `env_file` в docker-compose.

## Docker Compose

### Local / Dev (`docker-compose.yml`)

```bash
cd docker
docker compose up -d
```

Маппинг портов: `3000:3000` (app), `5432:5432` (postgres).

### E2E tests (`docker-compose.e2e.yml`)

```bash
cd docker
docker compose -f docker-compose.e2e.yml up e2e
# Playwright UI: http://localhost:8080
```

Требуется:
1. Приложение запущено (`docker compose -f docker-compose.yml up -d`)
2. Chrome на хосте с `--remote-debugging-port=9222`

### Production with nginx-proxy (`docker-compose.nginx-proxy.yml`)

```bash
cd docker
cp .env.example .env
# Отредактируйте: DOMAIN, EMAIL, APP_IMAGE, PG_ROOT_PASSWORD
docker compose -f docker-compose.nginx-proxy.yml pull app
docker compose -f docker-compose.nginx-proxy.yml up -d
```

Приложение подключается к **внешнему nginx-proxy** (например [`jwilder/nginx-proxy`](https://github.com/nginx-proxy/nginx-proxy) или [`jc21/nginx-proxy-manager`](https://github.com/Jc21/nginx-proxy-manager)). nginx-proxy берёт на себя маршрутизацию по домену и HTTPS (Let's Encrypt).

## Переменные окружения

### Production (`docker/env`)

| Variable | Default | Описание |
|----------|---------|----------|
| `PORT` | `3000` | Server port |
| `CORS_ORIGIN` | `https://app.example.com` | Allowed origins (comma-separated) |
| `JWT_SECRET` | `dev-secret-change-me` | **Изменить в production!** |
| `DB_TYPE` | `postgres` | `sqlite` or `postgres` (use postgres in prod) |
| `DB_HOST` | `postgres` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL user |
| `DB_DATABASE` | `app_db` | PostgreSQL database |
| `PG_ROOT_PASSWORD` | `postgres` | PostgreSQL password |

### Backend dev (`apps/backend/.env`)

| Variable | Default | Описание |
|----------|---------|----------|
| `DB_TYPE` | `sqlite` | SQLite или PostgreSQL |
| `DB_SQLITE_PATH` | `./data/database.sqlite` | SQLite file path |
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | `dev-secret-change-me` | JWT secret |
| `ADMIN_LOGIN` | `admin` | First admin login (empty DB only) |
| `ADMIN_PASSWORD` | `admin` | First admin password (empty DB only) |

## Локальный Production

```bash
# 1. Собрать фронтенд
npm run build:frontend

# 2. Собрать бэкенд
npm run build:backend

# 3. Запустить
npm run start:prod

# App: http://localhost:3000
```

## Порты

| Порт | Назначение | Доступ |
|------|-----------|--------|
| 3000 | Nest.js (API + static frontend) | Внутренний (Docker) / `localhost:3000` (dev) |
| 80   | HTTP (nginx-proxy) | Внешний (через proxy) |
| 443  | HTTPS (nginx-proxy) | Внешний (через proxy) |
| 5173 | Vite dev server | Только `npm run dev:frontend` |
| 5432 | PostgreSQL | Внутренний (Docker) |
| 9222 | Chrome CDP | Только e2e тесты |
| 8080 | Playwright UI | Только e2e Docker |

## Частые ошибки

1. **JWT-secret по дефолту** — замените `dev-secret-change-me` на production-ключ.
2. **CORS blocked** — укажите реальный домен в `CORS_ORIGIN`.
3. **App не стартует** — проверьте `docker compose logs app`; частая причина — PostgreSQL ещё не готов.
4. **Healthcheck не проходит** — убедитесь, что `PG_ROOT_PASSWORD` одинаковый во всех местах (`.env` + `docker-compose`).
5. **Нет `env_file` в nginx-proxy compose** — убедитесь, что `.env` существует и содержит `PG_ROOT_PASSWORD`.

## Чек-лист деплоя

- [ ] nginx-proxy + acme-companion запущены, сеть `reverse-proxy` доступна
- [ ] `.env` создан: `DOMAIN`, `EMAIL`, `APP_IMAGE`, `PG_ROOT_PASSWORD` заполнены
- [ ] Образ собран и запушен в Container Registry (или `docker compose build` прошёл)
- [ ] `JWT_SECRET` заменён на production-ключ
- [ ] `CORS_ORIGIN` установлен на реальный домен
- [ ] DNS-запись домена указывает на IP сервера
- [ ] `docker compose -f docker-compose.nginx-proxy.yml up -d` прошёл без ошибок
- [ ] PostgreSQL healthcheck прошёл, БД доступна
- [ ] HTTPS (Let's Encrypt) сертификат получен
- [ ] `curl -I https://<DOMAIN>/` → 200
- [ ] `curl https://<DOMAIN>/api/auth/me` → 401 (не авторизован)
