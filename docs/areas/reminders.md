# Reminders (Напоминания)

## Описание

Модуль для создания, просмотра, редактирования и удаления пользовательских напоминаний. Поддерживает одноразовые (текст + дата + время) и регулярные (с конкретными днями недели) напоминания. Включает cron-сервис для автоматической отправки просроченных напоминаний в Telegram.

## Архитектура

```
Backend (Nest.js)                          Frontend (Vue 3)
├── reminders/                              ├── api/reminders.ts
│   ├── reminders.controller.ts             ├── views/RemindersView.vue
│   ├── reminders.service.ts               └── router/index.ts  (/reminders)
│   ├── reminders.module.ts
│   ├── entities/reminder.entity.ts
│   └── dto/
│       ├── create-reminder.dto.ts
│       └── update-reminder.dto.ts
```

## Backend

### Entity — ReminderEntity

| Поле | Тип | Описание |
|------|-----|----------|
| id | int | PK, auto-increment |
| userId | int | FK → user (ManyToOne, CASCADE delete) |
| text | string | Текст напоминания |
| scheduledAt | datetime | Дата и время |
| isRecurring | boolean | Регулярное (default false) |
| weekdays | number[] | Дни недели 1-7 (1=Пн), nullable. simple-array в БД |
| isSent | boolean | Отправлено в Telegram (default false) |
| lastSent | datetime | Время последней отправки в Telegram, nullable |
| createdAt | datetime | — |
| updatedAt | datetime | — |

### DTO

**CreateReminderDto**: `{ text: string, scheduledAt: Date, isRecurring?: boolean, weekdays?: number[] }`
- `@Type(() => Date)` — парсит ISO-строку в Date
- `@Transform(({ value }) => value?.map(v => Number(v)))` — конвертирует weekdays в числа

**UpdateReminderDto**: `PartialType(CreateReminderDto)` — все поля опциональны.

### Service — RemindersService

| Метод | Описание |
|-------|----------|
| `findAll(userId, showPast)` | Без showPast: будущие одноразовые + все регулярные. С showPast=true: все |
| `findOne(id, userId)` | По id, проверка ownership |
| `create(userId, data)` | Создание с валидацией weekdays (1-7, уникальность) |
| `update(id, userId, data)` | Обновление с проверкой ownership |
| `remove(id, userId)` | Удаление с проверкой ownership |

**Фильтрация \"прошедших\"**:
- `isRecurring === true` → всегда показывается в \"будущих\" (игнорируется scheduledAt)
- `isRecurring === false` && `scheduledAt < now` → скрыта без showPast=true

**OnModuleInit — Cron-сервис**:
- Запускается каждую минуту (`* * * * *`) через `node-cron`
- Injected: `SettingsService` (для Telegram bot token + chat ID), `UsersService`
- Метод `processDueReminders()`: ищет просроченные напоминания и вызывает `sendToTelegram()`
  - **Одноразовые**: `isRecurring=false`, `isSent=false`, `scheduledAt <= now` → отправляет, ставит `isSent=true`
  - **Регулярные**: совпадение `weekdays` с текущим днём, время `scheduledAt` уже прошло, `lastSent` не сегодня → отправляет, обновляет `lastSent=now`
  - Если Telegram не настроен (нет токена или Chat ID) — тик пропускается с логом
- Метод `sendToTelegram(botToken, chatId, reminder)`: `POST` к `https://api.telegram.org/bot<token>/sendMessage`, текст с эмодзи (⏰ одноразовые, 🔁 регулярные) + имя пользователя
- Логирование: детальные логи на каждом тике (start/end, количество найденных, пропуски, результат отправки)

### Controller — RemindersController

Все маршруты под `@UseGuards(JwtAuthGuard)`, доступ по `req.user.id`.

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/reminders` | Список (будущие + регулярные) |
| GET | `/api/reminders?showPast=true` | Все напоминания |
| GET | `/api/reminders/:id` | Одно напоминание |
| POST | `/api/reminders` | Создать |
| PATCH | `/api/reminders/:id` | Обновить |
| DELETE | `/api/reminders/:id` | Удалить |

## Frontend

### API-клиент — api/reminders.ts

Axios-клиент с автоматическим приложением JWT-токена. Интерфейсы:

```typescript
interface Reminder {
  id: number;
  text: string;
  scheduledAt: string;
  isRecurring: boolean;
  weekdays: number[] | null;
  isSent: boolean;
  lastSent: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### RemindersView

Страница `/reminders`, доступ только для авторизованных пользователей.

**Компоненты:**
- **Список напоминаний** — карточки с текстом, датой, временем, днями недели (для регулярных)
- **Чекбокс \"Показать прошедшие\"** — переключает `?showPast` в GET-запросе
- **Модальное окно** — создание (кнопка \"Новое\") и редактирование (кнопка \"Редактировать\" при наведении)
- **Форма** — текст, дата (`<input type=\"date\">`), время (`<input type=\"time\">`), чекбокс \"Регулярное\", кнопки дней недели (Пн-Вс с `v-show`)
- **Удаление** — кнопка при наведении, подтверждение через `confirm()`

**Форматирование**:
- Даты: `Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })`
- Время: `HH:mm` через `Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })`
- Дни недели: массив → \"Вторник, Четверг, Суббота\" через `WEEKDAY_FULL` маппинг

**Реактивность weekdays**:
- `openEdit()` использует `nextTick()` перед `modalOpen = true` — без этого `v-show` на weekdays-блоке рендерит кнопки до обновления `formWeekdays`
- `toggleWeekday(value)` использует `splice`/`push` для реактивности Vue 3 ref array

## Common issues

1. **`scheduledAt` validation error** — \"must be a Date instance\". Решение: `@Type(() => Date)` в DTO
2. **`weekdays` validation error** — \"must be an integer number\". Решение: `@Transform` с `.map(v => Number(v))`
3. **Weekdays не отображаются при редактировании** — Vue не обновляет массив до рендера. Решение: `await nextTick()` перед открытием модала + `v-show` вместо `v-if`
4. **Время отображается неверно** — `toISOString()` конвертирует в UTC. Решение: использовать локальные `getHours()`/`getMinutes()` вместо `toISOString().slice()`
