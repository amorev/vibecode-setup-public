# Backend API Structure

## Описание

Nest.js API с глобальным префиксом `/api`. Пять модулей: `AuthModule` (JWT авторизация), `UsersModule` (CRUD пользователей), `SettingsModule` (настройки Telegram бота), `RemindersModule` (управление напоминаниями) и `EventsModule` (CRUD публичных мероприятий с пагинацией и фильтрами). База данных: SQLite (dev) / PostgreSQL (prod) через TypeORM.

## Ключевые файлы

| Файл | Роль |
|------|------|
| `apps/backend/src/main.ts` | Entry point: bootstrap, CORS, global prefix 'api', SPA fallback |
| `apps/backend/src/app.module.ts` | Root module: imports AuthModule, UsersModule, DatabaseModule |
| `apps/backend/src/auth/` | JWT auth module |
| `apps/backend/src/users/` | User CRUD module |
| `apps/backend/src/settings/` | Telegram bot settings module |
| `apps/backend/src/reminders/` | Reminders CRUD module |
| `apps/backend/src/events/` | Events CRUD module (public list + admin CRUD) |
| `apps/backend/src/database/database.module.ts` | TypeORM config (SQLite/PostgreSQL) |

## API Endpoints

### Auth

| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| POST | `/api/auth/login` | — | Login → `{ access_token }` |
| GET | `/api/auth/me` | JWT | Current user info |
| PATCH | `/api/auth/password` | JWT | Change password |

**Login request**: `{ login: string, password: string }`
**Login response**: `{ access_token: string }` (expires in 24h)

### Users

| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | `/api/users/count` | — | User count (public) |
| GET | `/api/users` | JWT | All users |
| GET | `/api/users/:id` | JWT | Single user |
| POST | `/api/users` | JWT | Create user |
| PATCH | `/api/users/:id` | JWT | Update user |
| DELETE | `/api/users/:id` | JWT | Delete user |

**Create user request**: `{ login: string, password: string, role?: 'admin' | 'user' }`
**User response**: `{ id, login, role, createdAt, updatedAt }` (no passwordHash)

### Settings

| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | `/api/settings` | JWT | Получить настройки Telegram бота (автосоздание строки если нет) |
| PATCH | `/api/settings` | JWT | Обновить настройки (частичное обновление) |
| POST | `/api/settings/send-test` | JWT | Отправить тестовое сообщение «тест» в Telegram |

**Settings response**: `{ telegramBotToken: string \| null, telegramChatId: string \| null }`
**Settings update request**: `{ telegramBotToken?: string, telegramChatId?: string }` (обязательные — нет, пустая строка очищает поле)
**Send-test response**: `{ ok: boolean, message: string }`

### Reminders

| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | `/api/reminders` | JWT | Список напоминаний текущего пользователя (будущие одноразовые + все регулярные) |
| GET | `/api/reminders?showPast=true` | JWT | Все напоминания (включая прошедшие) |
| GET | `/api/reminders/:id` | JWT | Одно напоминание |
| POST | `/api/reminders` | JWT | Создать напоминание |
| PATCH | `/api/reminders/:id` | JWT | Обновить напоминание |
| DELETE | `/api/reminders/:id` | JWT | Удалить напоминание |

**Create reminder request**: `{ text: string, scheduledAt: string (ISO), isRecurring?: boolean, weekdays?: number[] (1-7) }`
**Reminder response**: `{ id, userId, text, scheduledAt, isRecurring, weekdays, isSent, lastSent, createdAt, updatedAt }`

### Events

| Method | Endpoint | Auth | Описание |
|--------|----------|------|----------|
| GET | `/api/events` | — | Список мероприятий (public, пагинация + фильтры) |
| GET | `/api/events/:id` | — | Одно мероприятие (public) |
| POST | `/api/events` | JWT + Admin | Создать мероприятие |
| PATCH | `/api/events/:id` | JWT + Admin | Обновить мероприятие |
| DELETE | `/api/events/:id` | JWT + Admin | Удалить мероприятие |

**Query-параметры для `GET /api/events`**: `title?`, `description?` (LIKE-поиск), `dateFrom?`, `dateTo?` (диапазон по `eventDate`), `page?` (default 1), `limit?` (default 10, max 100).
- `dateFrom`/`dateTo` принимают ISO-строку или `YYYY-MM-DD` (трактуется как начало/конец дня в UTC).
- Фильтры по тексту применяются через `Like('%...%')` — поиск подстроки без учёта регистра.

**Create event request**: `{ title: string, description: string, link: string (URL), eventDate: string (ISO) }`
**Event response**: `{ id, title, description, link, eventDate, createdAt, updatedAt }`
**Paginated response** (`GET /api/events`): `{ items: Event[], total: number, page: number, limit: number, totalPages: number }`

## Структура модулей

### AuthModule

- `auth.service.ts` — `validateLogin()`, `validateJwtPayload()`, `changePassword()`
- `auth.controller.ts` — `/login`, `/me`, `/password`
- `jwt.strategy.ts` — Passport JWT strategy (reads `sub` from token)
- `jwt-auth.guard.ts` — Guard for protected routes, respects `@Public()`
- `public.decorator.ts` — `@Public()` decorator to skip auth guard

### UsersModule

- `users.service.ts` — `findAll()`, `findOne()`, `create()`, `update()`, `remove()`, `count()`, `changePassword()`
- `users.controller.ts` — CRUD endpoints + `GET /users/count` (public)
- `entities/user.entity.ts` — User table (login, passwordHash, role, createdAt, updatedAt)

### SettingsModule

- `settings.service.ts` — `get()` (autoseed), `update()`, `sendTestMessage()` (fetch к Telegram Bot API)
- `settings.controller.ts` — `GET /settings`, `PATCH /settings`, `POST /settings/send-test`
- `entities/settings.entity.ts` — Settings table (telegramBotToken, telegramChatId, createdAt, updatedAt)
- `dto/update-settings.dto.ts` — `{ telegramBotToken?, telegramChatId? }` с `@IsOptional()` + `@IsString()`

**Особенности SettingsModule:**
- Таблица `settings` — singleton: одна строка, создаётся автоматически при первом запросе `GET /settings`
- `sendTestMessage()` использует нативный `fetch()` (Node 24), не требует дополнительных зависимостей
- Отправка идёт через `POST https://api.telegram.org/bot<token>/sendMessage` с `chat_id` и `text: 'тест'`
- Если токен или Chat ID не установлены — возвращается `{ ok: false, message: '...' }` без вызова Telegram API

### RemindersModule

- `reminders.service.ts` — `findAll(userId, showPast)`, `findOne(id, userId)`, `create(userId, data)`, `update(id, userId, data)`, `remove(id, userId)`, `processDueReminders()`, `sendToTelegram()`
- `reminders.controller.ts` — CRUD endpoints, все под `@UseGuards(JwtAuthGuard)`
- `entities/reminder.entity.ts` — Reminder table (text, scheduledAt, isRecurring, weekdays, isSent, lastSent, userId FK)
- `dto/create-reminder.dto.ts` — `{ text, scheduledAt, isRecurring?, weekdays? }` с `@Type(() => Date)` и `@Transform` для weekdays
- `dto/update-reminder.dto.ts` — `partialType(CreateReminderDto)`

### EventsModule

- `events.service.ts` — `findAll(filters, pagination)`, `findOne(id)`, `create(dto)`, `update(id, dto)`, `remove(id)`. `findAll` использует `findAndCount` с `Like` (для `title`/`description`) и `Between` (для `eventDate`); сортировка `eventDate ASC`; `limit` ограничен 1-100.
- `events.controller.ts` — все эндпоинты под `@Controller('events')`. Public: `GET /` и `GET /:id` (через `@Public()`). Запись: `POST`, `PATCH /:id`, `DELETE /:id` — под `@UseGuards(JwtAuthGuard, AdminGuard)`.
- `entities/event.entity.ts` — `EventEntity` (см. [database-structure.md](./database-structure.md))
- `dto/create-event.dto.ts` — `{ title, description, link, eventDate }` с валидацией: `@IsString`, `@MaxLength(255)` на title, `@IsUrl({ require_tld: false })` на link, `@IsDate()` + `@Type(() => Date)` на eventDate
- `dto/update-event.dto.ts` — все поля опциональны (`@IsOptional()`)

**Особенности EventsModule:**
- Модуль импортирует `UsersModule` — `AdminGuard` использует `UsersService.findOne(id)` для проверки роли
- Фильтры по дате работают по полю `eventDate` (см. entity); пустые строки игнорируются
- При `dateFrom` без `dateTo` верхняя граница `9999-12-31`, и наоборот — нижняя `1970-01-01`
- Невалидная дата в query → `400 BadRequestException` ("Некорректная дата: ...")
- `parseFilterDate()` в контроллере принимает ISO-строки и `YYYY-MM-DD` (для `dateTo` — конец дня в UTC)

**RemindersModule импортирует** `SettingsModule` и `UsersModule` для работы cron-сервиса.

**Особенности RemindersModule:** (см. полное описание в [reminders.md](./reminders.md))
- `findAll()` без `showPast` возвращает будущие одноразовые + все регулярные напоминания
- `findAll()` с `showPast=true` возвращает все напоминания пользователя
- `weekdays` — массив чисел 1-7 (1=Пн, 7=Вс), nullable, хранится как simple-array в БД
- DTO использует `class-transformer` для корректной десериализации `scheduledAt` (Date из ISO-строки) и `weekdays` (числа из строк)
- Доступ к данным изолирован по `userId` — пользователь видит только свои напоминания
- **Cron-сервис**: `RemindersService` implements `OnModuleInit`, запускает cron каждую минуту (`* * * * *`) через `node-cron`. Ищет просроченные одноразовые (`isSent=false`) и регулярные (совпадение weekdays + время, не отправлено сегодня) напоминания. Отправляет в Telegram через Bot API, помечает `isSent=true` / `lastSent=now`. Если Telegram не настроен — тик пропускается.

## Auth Guard

Все user endpoints защищены `@UseGuards(JwtAuthGuard)`. Guard извлекает user из JWT payload (`sub` = user.id). Публичные маршруты помечены `@Public()`.

**`AdminGuard`** (`apps/backend/src/auth/admin.guard.ts`) — guard роли: пропускает только пользователей с `role === 'admin'`. Используется совместно с `JwtAuthGuard` через `@UseGuards(JwtAuthGuard, AdminGuard)`. Реализация:
- читает `userId` из `req.user.id` (который кладёт `JwtStrategy`),
- через `UsersService.findOne(userId)` загружает актуальную запись из БД (JWT-payload содержит только `sub`+`login`, без роли),
- бросает `ForbiddenException('Требуются права администратора')` если роль не `'admin'`.

Используется в `EventsModule` (POST/PATCH/DELETE на `/api/events`).

## Seeding

При старте (OnModuleInit): если нет пользователей в БД — создаётся первый админ (role='admin') из `ADMIN_LOGIN` / `ADMIN_PASSWORD` env vars.

## Database

- TypeORM `synchronize: true` (auto-migrate)
- SQLite for dev: `DB_TYPE=sqlite`, `DB_SQLITE_PATH=./data/database.sqlite`
- PostgreSQL for prod: `DB_TYPE=postgres`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`

**Сущности:**
- `user` — пользователи (login, passwordHash, role, createdAt, updatedAt)
- `settings` — настройки Telegram (telegramBotToken, telegramChatId, createdAt, updatedAt)
- `reminder` — напоминания (userId FK, text, scheduledAt, isRecurring, weekdays, isSent, lastSent, createdAt, updatedAt)
- `event` — публичные мероприятия (title, description, link, eventDate, createdAt, updatedAt)

## Common issues

1. **`EADDRINUSE` on port 3000**: `npm run kill:backend`
2. **JWT expired**: token expires in 24h, re-login
3. **CORS blocked**: set `CORS_ORIGIN` in backend `.env`
4. **DB not ready**: wait for TypeORM connection (check `logs/backend.log`)
5. **`AdminGuard` без `JwtAuthGuard`**: guard ожидает `req.user.id` — без `JwtAuthGuard` выше по цепочке получит 403 "Требуется авторизация"
