# Database Structure

## Описание

TypeORM с двумя подключениями: SQLite (dev) / PostgreSQL (prod). `synchronize: true` для auto-migration. Три сущности: User (авторизация), Settings (Telegram бот) и Reminder (напоминания).

## Ключевые файлы

| Файл | Роль |
|------|------|
| `apps/backend/src/database/database.module.ts` | TypeORM config (SQLite/PostgreSQL via DB_TYPE env) |
| `apps/backend/src/database/reset-db.ts` | DB reset script (drop + recreate) |
| `apps/backend/src/users/entities/user.entity.ts` | User entity |
| `apps/backend/src/reminders/entities/reminder.entity.ts` | Reminder entity |

## Сущности

### User

Таблица `user` — авторизация и управление пользователями.

| Column | Type | Constraints |
|--------|------|-------------|
| id | int (PK, auto) | — |
| login | string | unique, not null |
| passwordHash | string | not null |
| role | varchar | default 'user', values: 'admin', 'user' |
| createdAt | datetime | — |
| updatedAt | datetime | — |

### Reminder

Таблица `reminder` — пользовательские напоминания (одноразовые и регулярные).

| Column | Type | Constraints |
|--------|------|-------------|
| id | int (PK, auto) | — |
| userId | int (FK → user) | not null, indexed |
| text | string | not null |
| scheduledAt | datetime | not null |
| isRecurring | boolean | default false |
| weekdays | simple-array (JSON) | nullable, массив чисел 1-7 (1=Пн, 7=Вс) |
| isSent | boolean | default false, true = отправлено в Telegram |
| lastSent | datetime | nullable, время последней отправки в Telegram |
| createdAt | datetime | — |
| updatedAt | datetime | — |

**Особенности:**
- `weekdays` хранится как JSON-массив в SQLite (`[2, 4, 6]`) и как `jsonb` в PostgreSQL
- Связь с `User` — `ManyToOne`, каскадное удаление (`onDelete: 'CASCADE'`)
- Регулярные напоминания (`isRecurring=true`) игнорируют `scheduledAt` при фильтрации "прошедших"
- `isSent` / `lastSent` используются cron-сервисом для отслеживания отправки в Telegram: одноразовые помечаются `isSent=true` после отправки; регулярные обновляют `lastSent` для дедупликации в рамках одного дня

## Seeding

При `OnModuleInit` в `AppModule`: если в таблице `user` нет записей — создаётся первый админ (role='admin') из `ADMIN_LOGIN` / `ADMIN_PASSWORD` env vars.

## Reset DB

```bash
npm run db:reset
```

Drop all tables + recreate.

## Common issues

1. **SQLite vs PostgreSQL types**: date columns serialized differently
2. **DB not ready at startup**: TypeORM `synchronize` may take a moment, check `logs/backend.log`
