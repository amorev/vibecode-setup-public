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

## Настройка сервера с нуля

Сервер настраивается двумя скриптами, которые запускаются **по очереди** на чистом Ubuntu/Debian VPS. Скачиваются напрямую из GitHub через `wget` и запускаются через `bash` — ничего не нужно клонировать.

### Шаг 1 — Подготовка (swap + пароль нового пользователя)

Запускается под **любым пользователем с sudo** (в том числе под `root`). Скрипт создаст swap 2G, попросит дважды ввести пароль для будущего пользователя `vibecoder` и сохранит данные в `/root/setup-data/`.

```bash
wget -O /tmp/prepare-server-1.sh https://raw.githubusercontent.com/amorev/vibecode-setup-public/refs/heads/main/deploy/prepare/prepare-server-1.sh && bash /tmp/prepare-server-1.sh
```

В процессе будет дважды запрошен пароль (ввод скрыт) — **запомните его**, он понадобится для входа на сервер.

### Шаг 2 — Настройка пользователя, SSH, UFW, fail2ban

Запускается **только под root**. Скрипт установит пакеты (`sudo`, `ufw`, `fail2ban`, `openssh-server`), создаст пользователя `vibecoder`, сменит SSH-порт на `2091`, откроет его в firewall и включит fail2ban.

```bash
sudo bash -c 'wget -O /tmp/prepare-server-2.sh https://raw.githubusercontent.com/amorev/vibecode-setup-public/refs/heads/main/deploy/prepare/prepare-server-2.sh && bash /tmp/prepare-server-2.sh'
```

> ⚠️ **Не закрывайте текущую SSH-сессию сразу после шага 2!** Сначала откройте **новый терминал** и проверьте вход:
>
> ```bash
> ssh -p 2091 vibecoder@<IP_СЕРВЕРА>
> ```
>
> Проверьте sudo: `sudo -v`. Только после успешного входа под новым пользователем закрывайте root-сессию.

### Что делают скрипты

| Скрипт | Что делает |
|--------|-----------|
| `prepare-server-1.sh` | Создаёт swap 2G (swappiness 80), сохраняет хэш пароля в `/root/setup-data/password.hash`, пишет `/root/setup-data/env.txt` (`NEW_USERNAME=vibecoder`, `SSH_PORT=2091`) |
| `prepare-server-2.sh` | Ставит пакеты (`sudo`, `ufw`, `fail2ban`, `openssh-server`, `libpam-modules`, `logrotate`); создаёт пользователя `vibecoder` с sudo без пароля; меняет порт SSH на 2091, отключает root-вход; настраивает UFW (default deny, открыт только 2091) и fail2ban (5 попыток / 10 мин / бан 1 час) |

После успешной настройки сервер готов к деплою приложения — см. [agents/SERVER-DEPLOY.md](agents/SERVER-DEPLOY.md) или [docs/deployment.md](docs/deployment.md).

## Документация

- [GETTING_STARTED.md](docs/GETTING_STARTED.md) — запуск с нуля (Docker, nginx-proxy)
- [deployment.md](docs/deployment.md) — деплой, переменные окружения
- [testing-guide.md](docs/testing-guide.md) — руководство по тестированию
- [agents.md](docs/agents.md) — сводка для субагентов
- [areas/backend-api-structure.md](docs/areas/backend-api-structure.md) — Backend API
- [areas/frontend-structure.md](docs/areas/frontend-structure.md) — Frontend структура
- [areas/database-structure.md](docs/areas/database-structure.md) — База данных
- [areas/auth-structure.md](docs/areas/auth-structure.md) — Аутентификация

### Запуск Chrome для отладки

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --profile-directory="Profile 2" --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug\1"
```

После чего в mcp.json

```json
"chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--browser-url=http://127.0.0.1:9222"
      ],
      "directTools": true
    }
```


https://pi.dev/packages/pi-mcp-adapter
https://pi.dev/packages/pi-subagents
