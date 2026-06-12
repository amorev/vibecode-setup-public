# E2E Test Errors Report

**Дата запуска:** 2026-05-26  
**Результат:** 26 failed, 1 skipped, 17 passed (из 44 тестов)  
**Бэкенд:** запущен (seed успешен)  
**Фронтенд:** запущен (http://localhost:5173)  
**Браузер:** Chrome/148.0.7778.179 (CDP :9222)

---

## Сводка по категориям

| Категория | Кол-во ошибок | Основная причина |
|-----------|---------------|------------------|
| `auth.spec.ts` — `evaluate()` без `await` | 4 | `connectedPage.evaluate()` возвращает Promise, но не разыменован |
| `calendar.spec.ts` — формат заголовка месяца | 2 | Заголовок показывает «25 мая — 31 мая, 2026» вместо «май 2026» |
| `calendar.spec.ts` — строгий режим locator | 1 | `getByRole('heading')` нашёл 2 элемента |
| `availability-management.spec.ts` — 404 при DELETE | 3 | API-маршруты DELETE возвращают 404 (вероятно, конфликт маршрутов в контроллере) |
| `availability-management.spec.ts` — несоответствие типов | 2 | `daysOfWeek` приходит как `["1","2","3","4"]` вместо `[1,2,3,4]`; даты возвращаются как ISO-строки |
| `availability-management.spec.ts` — пустые слоты | 3 | Слотов нет (зависит от расписаний, которые не создались из-за предыдущих ошибок) |
| `availability-management.spec.ts` — UI strict mode | 1 | `getByText('Управление окнами')` нашёл 2 элемента (кнопка + h2) |
| `availability-management.spec.ts` — таймаут UI | 3 | Page закрыта (каскадная ошибка после UI strict mode) |
| `free-slots.spec.ts` — API слотов | 1 | 0 слотов для `2026-05-26` (нет расписаний на эту дату) |
| `free-slots.spec.ts` — UI зелёные точки | 2 | Нет элементов `.bg-green-500.rounded-full` (нет слотов → нет точек) |
| `settings.spec.ts` — race condition | 4 | Параллельные тесты конфликтуют за settings (один меняет, другой читает старые значения) |

---

## 1. auth.spec.ts — `connectedPage.evaluate()` без `await` (4 теста)

### Затронутые тесты

- `Authentication › accepts correct credentials and redirects to /admin`
- `Authentication › auth persists after page reload`
- `Authentication › protects /admin route without auth`
- `Authentication › logout clears token and redirects to login`

### Ошибка

```
Expected: "#/admin"
Received: Promise {}
```

### Причина

`connectedPage.evaluate()` возвращает Promise, но в тесте нет `await`. При запуске через CDP-подключённый браузер (remote Chrome) evaluate работает асинхронно и возвращает Promise. Без `await` в `expect()` попадает сам объект Promise, а не его результат.

**Файл:** `e2e/tests/auth.spec.ts`, строки 43, 75, 94, 111

```typescript
// ❌ Неправильно:
const hash = connectedPage.evaluate(() => window.location.hash);
expect(hash).toBe('#/admin');

// ✅ Правильно:
const hash = await connectedPage.evaluate(() => window.location.hash);
expect(hash).toBe('#/admin');
```

Также аналогичная проблема с `localStorage.getItem('auth_token')` на строках 47, 115.

### Исправление

Добавить `await` ко всем вызовам `connectedPage.evaluate()` в `auth.spec.ts`.

---

## 2. auth.spec.ts — строгий режим Playwright (1 тест)

### Затронутый тест

- `Authentication › shows login page`

### Ошибка

```
strict mode violation: getByRole('heading', { name: 'Meeting UI' }) resolved to 2 elements:
    1) <h1> 📅 Meeting UI </h1>  (в banner/header)
    2) <h1>📅 Meeting UI</h1>    (в main)
```

### Причина

На странице логина есть **два** заголовка `<h1>` с текстом «Meeting UI» — один в общем header-е навигации, второй в самом body страницы логина. Playwright в strict mode требует уникального локейтора.

### Исправление

Уточнить локейтор, чтобы он выбирал только один из двух элементов. Например:

```typescript
// Вариант 1: искать внутри <main>
connectedPage.locator('main').getByRole('heading', { name: 'Meeting UI' })

// Вариант 2: использовать exact match с эмодзи
connectedPage.getByRole('heading', { name: '📅 Meeting UI' })
```

---

## 3. calendar.spec.ts — формат заголовка месяца (2 теста)

### Затронутые тесты

- `Calendar › displays the calendar with current month`
- `Calendar › can navigate to current month`

### Ошибка

```
Expected substring: "май 2026"
Received string:    "25 мая — 31 мая, 2026"
```

### Причина

Тест вычисляет ожидаемый заголовок через:

```typescript
new Date().toLocaleString('ru-RU', { month: 'long', year: 'numeric' })
// → "май 2026"
```

Но фронтенд отображает заголовок в другом формате — «25 мая — 31 мая, 2026» (диапазон дней недели). Это не баг приложения, а расхождение между форматом в тесте и фактическим форматом в UI.

### Исправление

Изменить проверку на более гибкую:

```typescript
// Вместо toContain(currentMonth):
expect(await connectedPage.locator('h2').first().textContent()).toMatch(/май\s+2026/);
```

Или проверить, что заголовок содержит название месяца:

```typescript
const currentMonth = new Date().toLocaleString('ru-RU', { month: 'long' });
// → "май"
expect(headerText).toContain(currentMonth);
```

---

## 4. calendar.spec.ts — `shows events on the calendar` (1 тест)

### Ошибка

```
waiting for locator('.bg-blue-600')
```

### Причина

Тест ожидает элементы с классом `.bg-blue-600` (события на календаре). Если сид-данные не создают событий в текущем месяце (май 2026) или визуальное представление событий изменилось (другой класс цвета), тест не найдёт элементы.

### Исправление

1. Проверить, что `seed()` создаёт события в текущем месяце.
2. Если класс событий изменился, обновить селектор в тесте.

---

## 5. availability-management.spec.ts — 404 при DELETE (3 теста)

### Затронутые тесты

- `Availability Management API › CRUD slot exclusions`
- `Availability Management API › Slot exclusions mark specific slots as excluded`
- `Availability Management API › Multiple schedules on same day merge correctly`

### Ошибка

```
AxiosError: Request failed with status code 404
at clearAvailabilityData() → DELETE /api/events/schedules/${s.id}
```

### Причина

Функция `clearAvailabilityData()` (вызывается в `beforeEach`) пытается удалить все расписания, отпуска, исключения и бронирования. GET-запросы работают, но DELETE возвращает 404.

Возможные причины:
1. **Конфликт маршрутов:** В `events.controller.ts` есть `@Delete(':id')` для событий в конце файла. NestJS может неправильно маршрутизировать `DELETE /events/schedules/1`, если статические маршруты (`schedules`) не имеют приоритета.
2. **ID приходит как строка:** `s.id` может быть UUID или строкой, которую `parseInt(id, 10)` не может распарсить.
3. **Параллельное выполнение:** Один тест удалил ресурс, другой пытается удалить тот же.

### Исправление

1. Добавить `try/catch` в `clearAvailabilityData()` для каждого DELETE (чтобы один проваленный DELETE не ломал весь тест).
2. Проверить, что маршруты DELETE в контроллере имеют правильный приоритет (статические пути ДО `:id`).
3. Возможно, нужно использовать `@Delete('schedules/:id')` явно, а не полагаться на порядок.

---

## 6. availability-management.spec.ts — несоответствие типов (2 теста)

### 6a. `daysOfWeek` приходит как строки вместо чисел

### Затронутый тест

- `Availability Management API › CRUD recurring schedules`

### Ошибка

```
Expected: [1, 2, 3, 4]
Received: ["1", "2", "3", "4"]
```

### Причина

Сущность использует `@Column('simple-array')` для `daysOfWeek`. SQLite хранит простые массивы как строки через разделитель. При десериализации TypeORM может возвращать элементы как строки вместо чисел.

### Исправление

**Вариант А (рекомендуемый):** В сервисе или DTO явно приводить типы:

```typescript
// В events.service.ts при возврате:
schedule.daysOfWeek = schedule.daysOfWeek.map(d => parseInt(d, 10));
```

**Вариант Б:** В тесте использовать `toEqual(['1', '2', '3', '4'])` — но это менее корректно, так как контракт API должен возвращать числа.

---

### 6b. Даты возвращаются как ISO-строки

### Затронутый тест

- `Availability Management API › CRUD vacation periods`

### Ошибка

```
Expected: "2026-07-01"
Received: "2026-07-01T00:00:00.000Z"
```

### Причина

`@Column({ type: 'date' })` в TypeORM хранит дату, но при сериализации в JSON Date превращается в ISO-строку `2026-07-01T00:00:00.000Z`.

### Исправление

**Вариант А:** Добавить глобальный JSON transformer в NestJS:

```typescript
// В main.ts
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(ValidationPipe)));
```

**Вариант Б:** В сущности использовать transformer:

```typescript
@Column({ type: 'date' })
startDate: string;
```

Хранить даты как строки `YYYY-MM-DD` вместо `Date` объектов.

**Вариант В:** В тестах сравнивать только префикс:

```typescript
expect(vacation.startDate.startsWith('2026-07-01')).toBe(true);
```

---

## 7. availability-management.spec.ts — пустые слоты (3 теста)

### Затронутые тесты

- `Computed slots use recurring schedules`
- `Vacations exclude dates from computed slots`
- `Different slot durations generate different slots`

### Ошибка

```
Expected: > 0
Received:   0
```

### Причина

Каскадная ошибка: `beforeEach` вызывает `clearAvailabilityData()`, которая падает с 404. Но даже если `clearAvailabilityData` отработала частично, слоты не генерируются, потому что:

1. Расписания могли не создраться (прошлые тесты их удалили).
2. `findFreeSlotsByRange` не находит слотов, если нет расписаний.
3. Параллельное выполнение тестов: один тест удалил расписание, пока другой его использовал.

### Исправление

1. Сначала исправить 404 в `clearAvailabilityData()`.
2. Добавить изоляцию тестов: каждый тест, который проверяет слоты, должен сам создавать необходимые расписания (что уже частично сделано).
3. Рассмотреть `test.serial` для группы тестов, которые зависят от общего состояния.

---

## 8. availability-management.spec.ts — UI strict mode (1 тест)

### Затронутый тест

- `Availability Management UI › Admin can access slots management page`

### Ошибка

```
strict mode violation: getByText('Управление окнами') resolved to 2 elements:
    1) <button>⏰ Управление окнами</button>
    2) <h2>Управление окнами</h2>
```

### Причина

На странице есть и кнопка навигации, и заголовок h2 с одинаковым текстом. Playwright `getByText()` нашёл оба.

### Исправление

```typescript
// Искать только h2:
connectedPage.getByRole('heading', { name: 'Управление окнами' })

// Или только кнопку:
connectedPage.getByRole('button', { name: 'Управление окнами' })
```

---

## 9. availability-management.spec.ts — UI таймауты (3 теста)

### Затронутые тесты

- `Admin can create a recurring schedule via UI`
- `Admin can create a vacation period via UI`
- `Preview tab shows computed slots`

### Ошибка

```
Test timeout of 30000ms exceeded.
page.waitForTimeout: Target page, context or browser has been closed
```

### Причина

Каскадная ошибка: предыдущие UI-тесты падали, контекст страницы мог быть закрыт. При подключении через CDP к реальному браузеру, если вкладка закрывается или браузер теряет связь, все последующие тесты падают с «page closed».

### Исправление

1. Исправить первопричину (strict mode ошибки выше).
2. Убедиться, что `connectedPage` fixture корректно создаёт новую страницу для каждого теста.

---

## 10. free-slots.spec.ts — API слотов (1 тест)

### Затронутый тест

- `Free Slots API › GET /free-slots/date returns slots for a specific date`

### Ошибка

```
Expected: > 0
Received:   0
```

Для `2026-05-26` (суббота) слотов нет, потому что расписания покрывают только рабочие дни (или расписания отсутствуют).

### Причина

Тест ждёт слотов на конкретную дату, но:
1. Нет расписаний на суботы.
2. `clearAvailabilityData()` из availability-management тестов могла удалить все расписания.
3. Seed не создаёт расписания recurring schedules — только события.

### Исправление

1. Запросить слоты на дату, когда точно есть расписание (понедельник).
2. Или создать расписание в `beforeEach` этого теста.
3. Добавить `beforeEach` с созданием расписания на тестовую дату.

---

## 11. free-slots.spec.ts — UI зелёные точки (2 теста)

### Затронутые тесты

- `Calendar Free Slots UI › month view shows green dots on days with free slots`
- `Calendar Free Slots UI › clicking a day with free slots opens day view showing slots`

### Ошибка

```
Expected: > 0
Received:   0  (dotCount)
element(s) not found  (.bg-green-500.rounded-full)
```

### Причина

Каскадная ошибка: если нет свободных слотов (см. п. 10), то и зелёные точки не отрисовываются. Также возможно, что класс CSS для точек изменился (например, Tailwind скомпилировал другой класс).

### Исправление

1. Обеспечить наличие слотов (создать расписание).
2. Проверить, что класс `.bg-green-500.rounded-full` всё ещё используется в компоненте календаря.

---

## 12. settings.spec.ts — race condition параллельных тестов (4 теста)

### Затронутые тесты

- `Admin Settings Page › loads and displays working hours from API`
- `Calendar respects working hours › week view time slots match configured working hours`
- `Calendar respects working hours › day view time slots match configured working hours`
- `Calendar respects working hours › changing settings updates calendar time range` (проходит, но может падать нестабильно)

### Ошибка

```
Expected: "10:00"
Received: "09:00"
```

### Причина

Тест `Settings API › PATCH /api/events/settings updates working hours` (строка 17) меняет настройки на `10:00–17:00` и потом восстанавливает. Но тест `loads and displays working hours from API` читает настройки параллельно и получает либо `10:00` (если PATCH прошёл раньше), либо `09:00` (исходное значение).

Аналогично, тесты `week view` и `day view` читают настройки через API, но параллельный тест их уже изменил.

**Один из таких тестов (`PATCH accepts partial update`) уже помечен как `.skip` с комментарием «race condition with parallel tests».**

### Исправление

**Вариант А (рекомендуемый):** Использовать `test.serial` для группы Settings API:

```typescript
test.describe.serial('Settings API', () => {
  // ...
});
```

**Вариант Б:** Каждый тест, который читает/меняет настройки, должен:
1. Сохранить оригинальные настройки.
2. Установить известные значения.
3. Провести проверку.
4. Восстановить оригинальные значения.

**Вариант В:** Вынести «изменяющие» тесты в отдельный describe с `.serial`.

---

## Приоритеты исправления

| Приоритет | Исправление | Влияние |
|-----------|-------------|---------|
| 🔴 Высокий | Добавить `await` к `connectedPage.evaluate()` в `auth.spec.ts` | 4 теста |
| 🔴 Высокий | Зафиксировать race condition в `settings.spec.ts` (serial или изоляция) | 3–4 теста |
| 🟡 Средний | Исправить строгий режим locator'ов (auth + availability) | 2 теста |
| 🟡 Средний | Уточнить формат заголовка месяца в `calendar.spec.ts` | 2 теста |
| 🟡 Средний | Добавить `try/catch` в `clearAvailabilityData()` | 3+ теста (каскадно) |
| 🟢 Низкий | Привести `daysOfWeek` к числам на бэкенде | 1 тест |
| 🟢 Низкий | Нормализовать формат дат в API (Date → YYYY-MM-DD) | 1 тест |
| 🟢 Низкий | Убедиться, что seed создаёт слоты на нужные даты | 1–2 теста |
