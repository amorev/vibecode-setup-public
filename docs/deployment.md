# Deployment

## Обзор

Приложение деплоится **нативно** на Linux-сервере (Ubuntu 22+) и запускается как **`systemd`-сервис** (`vibecode-setup.service`). Никакого nginx/reverse proxy/SSL — это **тестовая** установка, доступ через `http://<IP>:3000` напрямую. Контейнеризация не используется.

## Тестовый стек

```
Internet ── HTTP ──> :3000 ──> systemd/vibecode-setup ──> SQLite (файл) или PostgreSQL (5432)
```

## Сборка и деплой

См. подробное пошаговое руководство в [`GETTING_STARTED.md` → «Деплой на сервер (нативно, через systemd)`](./GETTING_STARTED.md#деплой-на-сервер-нативно-через-systemd).

Краткая сводка:

```bash
# На сервере
cd /opt/app
sudo -u app git pull
sudo -u app npm ci
sudo -u app npm run build
sudo systemctl restart vibecode-setup
sudo journalctl -u vibecode-setup -n 100 --no-pager
```

## systemd unit

Файл: `/etc/systemd/system/vibecode-setup.service`

```ini
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
```

Полезные команды:

```bash
sudo systemctl status vibecode-setup   # статус
sudo systemctl restart vibecode-setup  # рестарт
sudo journalctl -u vibecode-setup -f   # логи (live)
```

## Переменные окружения (test)

Файл: `/opt/app/apps/backend/.env`

| Variable | Default | Описание |
|----------|---------|----------|
| `PORT` | `3000` | Server port (слушает напрямую, без proxy) |
| `CORS_ORIGIN` | `http://<IP>:3000` | Allowed origins (comma-separated) |
| `JWT_SECRET` | `dev-secret-change-me` | **Обязательно изменить!** |
| `DB_TYPE` | `sqlite` | `sqlite` или `postgres`. В тесте — `sqlite` |
| `DB_SQLITE_PATH` | `./data/database.sqlite` | Путь к SQLite-файлу |
| `DB_HOST` | `127.0.0.1` | PostgreSQL host (если `DB_TYPE=postgres`) |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | — | PostgreSQL password |
| `DB_DATABASE` | `app_db` | PostgreSQL database |
| `ADMIN_LOGIN` | `admin` | Первый админ (только на пустой БД) |
| `ADMIN_PASSWORD` | `admin` | Первый админ (только на пустой БД) |

## Локальный Production (проверка prod-сборки без сервера)

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
| 3000 | Nest.js (API + static frontend) | `http://<IP>:3000` напрямую (без proxy) |
| 5173 | Vite dev server | Только `npm run dev:frontend` |
| 5432 | PostgreSQL | `127.0.0.1` (если локальный) |
| 9222 | Chrome CDP | Только e2e тесты |

## Частые ошибки

1. **JWT-secret по дефолту** — замените `dev-secret-change-me` на длинную случайную строку.
2. **CORS blocked** — укажите реальный источник в `CORS_ORIGIN` (например, `http://<IP>:3000`).
3. **App не стартует** — проверьте `sudo journalctl -u vibecode-setup -n 100`; частая причина — отсутствует или повреждён `.env`, либо Node.js не той версии.
4. **Не открыть в браузере** — проверьте, что порт 3000 открыт в UFW (`sudo ufw status`) и сервис слушает (`ss -tlnp | grep 3000`).
5. **EADDRINUSE на 3000** — другой процесс занял порт. `sudo lsof -i :3000` или `ss -tlnp | grep 3000`.

## Чек-лист деплоя

- [ ] Сервер подготовлен (Node 22 установлен)
- [ ] Пользователь `app` создан, `/opt/app` принадлежит ему
- [ ] Репозиторий склонирован в `/opt/app`, `npm ci` и `npm run build` выполнены
- [ ] `apps/backend/.env` заполнен (особенно `JWT_SECRET`, `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `CORS_ORIGIN`)
- [ ] `/etc/systemd/system/vibecode-setup.service` создан, `daemon-reload` + `enable --now` выполнены
- [ ] Порт 3000 открыт в UFW: `sudo ufw allow 3000/tcp`
- [ ] `systemctl status vibecode-setup` → active
- [ ] `curl http://127.0.0.1:3000/api/users/count` отдаёт число (не 502/500)
- [ ] В браузере `http://<IP>:3000/` отображается публичная страница
- [ ] `journalctl -u vibecode-setup -n 50` не содержит ERROR
