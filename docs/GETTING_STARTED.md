# Getting Started

## Что это за проект

Шаблон Nest.js + Vue 3 приложения с авторизацией, админ-панелью управления пользователями и публичной страницей. База данных: SQLite (dev) / PostgreSQL (prod).

**Деплой — только нативный**: приложение работает как `systemd`-сервис на Linux-сервере (Ubuntu 22+), доступ через `http://<IP>:3000` напрямую. Без nginx, без SSL — это тестовая установка.

## Быстрый старт (dev-режим, локально)

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

### 3. Запуск в dev-режиме

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

## Деплой на сервер (нативно, через systemd)

> **Замечание:** вспомогательные скрипты в `deploy/prepare/` (создание пользователя, настройка SSH, UFW, fail2ban) запускаются **вручную владельцем сервера** — не агентами и не из деплоя. Они готовят «голый» сервер к приёму приложения.

Это **тестовая** установка — приложение доступно напрямую через `http://<IP>:3000`, без reverse proxy и SSL.

### Требования

- Сервер с Ubuntu 22.04+ (или другим современным Linux с systemd)
- Node.js 22+ и npm (`node -v`, `npm -v`)
- Доступ `sudo` для текущего пользователя

### Шаг 1. Подготовить сервер

Подготовка сервера выполняется **вручную** (не из приложения, не из агента). Минимальный набор:

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Node.js 22+ (через nvm — рекомендуется)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
nvm alias default 22

# Создать пользователя для приложения (опционально)
sudo useradd -m -s /bin/bash app
sudo mkdir -p /opt/app
sudo chown app:app /opt/app
```

Дополнительно рекомендуется настроить (тоже руками):
- firewall (UFW) — открыть 22 и 3000
- fail2ban для SSH
- SSH-ключи, отключение парольного входа для root
- резервное копирование

> Скрипты-автоматизаторы для этих шагов лежат в `deploy/prepare/`. Запускайте их вручную и под своим контролем.

### Шаг 2. Развернуть приложение

```bash
# Клонируйте на сервер
sudo -u app git clone <repo-url> /opt/app
cd /opt/app
sudo -u app npm ci

# Соберите production-артефакты
sudo -u app npm run build
```

В результате:
- `apps/frontend/dist/` — статический frontend
- `apps/backend/dist/` — скомпилированный Nest.js

### Шаг 3. Настроить `.env` для теста

```bash
sudo -u app cp apps/backend/.env.example apps/backend/.env
sudo -u app nano apps/backend/.env
```

Заполнить:
- `DB_TYPE=sqlite` (для теста — проще, без отдельного PostgreSQL)
- `JWT_SECRET=<длинная-случайная-строка>`
- `ADMIN_LOGIN=<придумать>`
- `ADMIN_PASSWORD=<придумать>`
- `CORS_ORIGIN=http://<IP>:3000,http://<DOMAIN>:3000` (через запятую, если будут варианты)
- `PORT=3000`

> Для теста SQLite достаточно. PostgreSQL — только если планируется реальная нагрузка.

### Шаг 4. Установить и запустить systemd-сервис

Создайте unit-файл:

```bash
sudo tee /etc/systemd/system/vibecode-setup.service > /dev/null <<'EOF'
[Unit]
Description=VibeSetup (Nest.js + Vue 3 SPA)
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/opt/app
EnvironmentFile=/opt/app/apps/backend/.env
ExecStart=/usr/bin/node /opt/app/apps/backend/dist/main.js
Restart=on-failure
RestartSec=5

# Логи
StandardOutput=append:/var/log/vibecode-setup/app.log
StandardError=append:/var/log/vibecode-setup/error.log

# Ограничения
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# Создать директорию для логов
sudo mkdir -p /var/log/vibecode-setup
sudo chown app:app /var/log/vibecode-setup

# Включить и запустить
sudo systemctl daemon-reload
sudo systemctl enable --now vibecode-setup
sudo systemctl status vibecode-setup
```

Проверить, что приложение слушает порт:
```bash
curl -s http://127.0.0.1:3000/api/users/count
```

### Шаг 5. Открыть порт в firewall

```bash
sudo ufw allow 3000/tcp
```

### Готово

Приложение доступно по **`http://<IP>:3000`** (где `<IP>` — IP сервера).

### Обновление приложения

```bash
cd /opt/app
sudo -u app git pull
sudo -u app npm ci
sudo -u app npm run build
sudo systemctl restart vibecode-setup
sudo journalctl -u vibecode-setup -n 100 --no-pager
```

### Откат

```bash
cd /opt/app
sudo -u app git checkout <previous-tag-or-commit>
sudo -u app npm ci
sudo -u app npm run build
sudo systemctl restart vibecode-setup
```

### Логи

```bash
# journald (рекомендуется)
sudo journalctl -u vibecode-setup -f

# Файловые логи (если настроены в unit)
sudo tail -f /var/log/vibecode-setup/app.log
```

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
├── deploy/
│   └── prepare/          # Скрипты подготовки сервера (запускать вручную)
├── docs/                 # Документация
├── scripts/              # log-runner, kill-service, ssh.sh
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
| `npm run start:prod` | Production mode (локально) |
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
