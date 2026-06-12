# Agents Summary

Сводка для субагентов: что читать перед работой над конкретной областью.

## Быстрая навигация

| Файл | Область | Когда использовать |
|------|---------|-------------------|
| `project-overview.md` | Общая архитектура | Новому агенту для понимания стека |
| `GETTING_STARTED.md` | Запуск с нуля | Dev, нативный деплой (systemd) |
| `areas/backend-api-structure.md` | Backend API (auth, users, events) | CRUD пользователей, JWT auth, AdminGuard, Events CRUD |
| `areas/auth-structure.md` | Аутентификация | JWT, login/logout, guard |
| `areas/database-structure.md` | База данных | TypeORM сущности (User, Settings, Reminder, Event), миграции |
| `areas/frontend-structure.md` | Frontend (Vue SPA) | Страницы, роутинг, API-клиент |
| `areas/e2e-testing-structure.md` | E2E-тесты | Playwright, CDP, новые тесты |
| `areas/admin-panel.md` | Админ-панель | AdminLayout, роуты (`/admin`, `/admin/events`, `/admin/telegram-bot`), навигация |
| `testing-guide.md` | Руководство по тестированию | Запуск тестов, написание |
| `deployment.md` | Нативный деплой (systemd), порты, env | Деплой |

## Субагенты

Проект использует субагентов для автоматизации рутинных задач. Вызываются через `@<name> <сообщение>`.

| Субагент | Вызов | Назначение |
|----------|-------|------------|
| `browser-checker` | `@browser-checker проверь страницу` | Вся браузерная работа (по умолчанию) — навигация, скриншоты, консоль, DOM, сетевой анализ. Делегируйте этому субагенту. Прямые вызовы `chrome_devtools_*` допустимы только если пользователь **явно** просит сделать браузерную работу самостоятельно («ты сам проверь», «без субагентов» и т. п.). |
| `docs-maintainer` | `@docs-maintainer обнови docs` | Обновляет `docs/` после изменений в коде. Сравнивает текущий код с документацией и вносит точечные правки. Вызывать после каждой задачи. |
| `test-runner` | `@test-runner запусти тесты` | Запускает e2e тесты и возвращает отчёт (pass/fail с ошибками). Не чинит код — только отчёт. |
| `test-fixer` | `@test-fixer почини тесты` | Запускает тесты, анализирует ошибки, чинит root cause в коде, перезапускает, подтверждает passing. |
| `server-operator` | `@server-operator выполни на сервере` | **Shell на удалённом сервере** через `ssh-connect` MCP. Используется для: диагностика, systemd, apt, ufw, чтение логов, `npm ci`/`npm run build` на сервере, файловые операции (`rm`/`mv`/`chown`) когда файлы уже на диске. **НЕ** загружает файлы — для этого есть `sftp-operator`. |
| `sftp-operator` | `@sftp-operator залей файл` | **Передача файлов** на/с удалённого сервера через `sftp-connect` MCP: upload tar.gz, download логов, листинг директорий. **НЕ** выполняет shell — `sftp_connect_exec` в этом проекте запрещён. |
| `server-deployer` | `@server-deployer разверни проект` | **Оркестратор деплоя** — координирует `sftp-operator` (заливка tar.gz) + `server-operator` (shell: `npm ci`, `systemctl restart`, healthcheck). Полный деплой или обновление по `deploy/SERVER-DEPLOY.md`. |

### Как вызывать

```text
# Проверка страницы в браузере:
@browser-checker открой http://localhost:5173 и сделай скриншот публичной страницы

# Обновление документации после изменений:
@docs-maintainer обнови docs, я добавил новый эндпоинт

# Без описания (сам находит рассхождения):
@docs-maintainer проверь и обнови docs

# Запуск всех тестов:
@test-runner запусти все e2e тесты

# Запуск конкретного файла:
@test-runner запусти tests/basic.spec.ts

# Починить падающие тесты:
@test-fixer почини тесты

# Залить файл на сервер:
@sftp-operator загрузи D:/path/local.txt в /home/vibecoder/app/local.txt

# Выполнить команду на сервере:
@server-operator перезапусти systemd-сервис vibecode-setup.service

# Полный деплой:
@server-deployer разверни приложение на сервер vibecoder@2.26.67.89:2091, путь /home/vibecoder/app
```

## Правила

1. **Не запускайте сервисы** — используйте `logs/backend.log` и `logs/frontend.log` для дебага.
2. **`chrome_devtools_*` вызывать напрямую только по явной просьбе** — по умолчанию вся браузерная работа через `@browser-checker`. Если пользователь прямо просит сделать самому («ты сам», «без субагентов», «напрямую»), допустимо вызывать `chrome_devtools_*` инструменты самостоятельно.
3. **E2E-тесты импортируйте от `@playwright/test`** напрямую, используйте `{ page }` fixture.
4. **Всегда используйте полные URL** в E2E (не относительные пути).
5. **Не коммитьте `.env.local`, `*.sqlite`, `logs/`, `test-results/`** — см. `.gitignore`.
6. **JWT-secret**: замените `dev-secret-change-me` в production.
7. **Порядок маршрутов**: статические пути (`users/count`, `users`) ДО параметризованных (`:id`).
8. **После изменений в коде** — вызывайте `@docs-maintainer` для обновления документации.
9. **Public admin routes**: для admin-only маршрутов используйте связку `@UseGuards(JwtAuthGuard, AdminGuard)`. `AdminGuard` читает роль из БД (JWT содержит только `sub`+`login`).

## Контекстные файлы

Каждый файл в `areas/` содержит:
- Назначение области (2-3 предложения)
- Ключевые файлы и их роль
- Входные/выходные данные (API, props, events)
- Зависимости от других областей
- Частые ошибки
- Чек-лист при изменениях
