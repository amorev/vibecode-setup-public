# ТЗ: Корректировка e2e-тестов после редизайна

## 1. Контекст

После работы `html-designer` верстка фронтенда была полностью переработана:
- Цветовая палитра: `green-*` → `emerald-*` (Tailwind)
- Эмодзи-иконки → inline SVG
- Компонентные классы: `.surface-card`, `.btn-primary`, `.input-base` и т.д.
- Добавлены тёмная/светлая тема, переключатель Light/System/Dark
- Адаптивные ширины (responsive): `w-14 sm:w-16` вместо фиксированных
- Header календаря: добавлены кнопки переключения темы
- LoginView: split-layout с декоративной панелью

**Не изменилась**: бизнес-логика, API, роутинг, названия кнопок и заголовков.

---

## 2. Список файлов тестов

| Файл | Кол-во тестов | Описание |
|------|--------------|----------|
| `e2e/tests/auth.spec.ts` | 6 | Авторизация, login/logout, защита роутов |
| `e2e/tests/calendar.spec.ts` | 4 | Отображение календаря, навигация, события |
| `e2e/tests/free-slots.spec.ts` | 7 | API слотов, UI точки и ячейки |
| `e2e/tests/availability-management.spec.ts` | 12 | CRUD расписаний/отпусков/исключений, UI |
| `e2e/tests/settings.spec.ts` | 11 | API настроек, UI настроек, интеграция с календарём |

**Итого: ~40 тестов**

---

## 3. Изменения, влияющие на тесты

### 3.1. Цветовая палитра: `green-*` → `emerald-*`

| Было | Стало | Где |
|------|-------|-----|
| `bg-green-500` (зелёные точки) | `bg-emerald-500` | `CalendarMonth.vue` — индикаторы свободных слотов |
| `bg-green-50` (зелёные ячейки) | `bg-emerald-50` | `CalendarWeek.vue`, `CalendarDay.vue` — свободные слоты |
| `bg-green-100` (hover) | `bg-emerald-100` | Week/Day views |

### 3.2. Header календаря — новые кнопки темы

В `Calendar.vue` header добавлены кнопки `Light / System / Dark` + кнопка-тоггл темы.
Порядок кнопок в header: `←`, `→`, `[15м]`, `[30м]`, `[45м]`, `[1ч]`, `Сегодня`, `Месяц`, `Неделя`, `День`, `Light`, `System`, `Dark`, `[☀/☾]`

### 3.3. Responsive gutter width

| Было | Стало | Где |
|------|-------|-----|
| `w-14` (фиксировано) | `w-14 sm:w-16` | Week view — gutter с метками времени |
| `w-16` (фиксировано) | `w-14 sm:w-16` | Day view — gutter с метками времени |

На desktop viewport (1280px) → `w-16`, на mobile → `w-14`.

### 3.4. Time labels — убран `text-right`

В `CalendarWeek.vue` метки времени больше не имеют класса `text-right`:

```html
<!-- Было -->
class="h-6 flex-shrink-0 text-right pr-2 text-xs text-gray-400 leading-6"
<!-- Стало -->
class="h-6 pr-2 text-right text-[11px] leading-6 text-slate-400"
```

> **Примечание**: `text-right` остался в `CalendarDay.vue`, но убран в `CalendarWeek.vue`.

### 3.5. Текст в слотах

| Было | Стало |
|------|-------|
| `📌 записаться` | `Записаться` |
| `🟢 N свободных / M всего` | `● N свободных / M всего · слоты по X мин` |
| `🚫` | SVG-иконка (крестик) |
| `⏳`, `✅`, `❌` | SVG-иконки |

### 3.6. AdminLayout — навигация без эмодзи

| Было | Стало |
|------|-------|
| `📋 Бронирования` | `Бронирования` |
| `⏰ Управление окнами` | `Управление окнами` |
| `⚙️ Настройки` | `Настройки` |
| `🔒 Admin Panel` | `Admin Panel` (с SVG-иконкой замка) |

### 3.7. LoginView — split layout

- Логотип `📅 Meeting UI` в header → SVG-иконка + `Meeting UI` (без эмодзи)
- `<h1>` на странице логина: `Вход в админ-панель` (без эмодзи)
- Форма использует `.input-base` и `.btn-primary` вместо inline классов
- Placeholder `admin` и `••••••••` сохранены

### 3.8. ManageSlotsView — табы

| Было | Стало |
|------|-------|
| `📅 Регулярные окна` | `Регулярные окна` |
| `🏖 Отпуска` | `Отпуска` |
| `🚫 Исключения` | `Исключения` |
| `👁 Предпросмотр` | `Предпросмотр` |

---

## 4. Конкретные исправления по каждому файлу

### 4.1. `e2e/tests/auth.spec.ts`

#### ✅ Тесты, которые работают без изменений (5 из 6)

- `rejects wrong credentials` — селекторы `input[type="text"]`, `input[type="password"]`, `button[type="submit"]` не изменились
- `accepts correct credentials and redirects to /admin` — `getByRole('heading', { name: 'Admin Panel' })` работает
- `auth persists after page reload` — проверка хеша и токена не зависит от UI
- `protects /admin route without auth` — проверка редиректа по хешу
- `logout clears token and redirects to login` — кнопка `Выйти` по-прежнему `getByRole('button', { name: 'Выйти' })`

#### ❌ Тест 1: `shows login page` — strict mode violation

**Проблема**: `connectedPage.locator('main').getByRole('heading', { name: 'Meeting UI' })`

В `App.vue` есть `<h1>` с текстом `Meeting UI` (в header). `main` содержит и header и router-view. На странице логина внутри `<main>` может быть только один `h1` (в header), но если и header и body страницы логина находятся внутри `main`, то Playwright найдёт два элемента.

**Структура App.vue**:
```html
<main>
  <header>
    <h1>Meeting UI</h1>  <!-- ← в header, внутри main -->
  </header>
  <router-view>
    <!-- LoginView: -->
    <!-- нет <h1> с "Meeting UI" на самой странице логина -->
  </router-view>
</main>
```

**Исправление**: Уточнить локейтор — искать заголовок страницы входа, а не логотип:

```typescript
// Искать заголовок страницы логина вместо логотипа в хедере
await expect(
  connectedPage.getByText('Вход в админ-панель')
).toBeVisible({ timeout: 10000 });
```

Или, если нужно проверить именно `<h1>`:

```typescript
// Искать h1 только внутри header (логотип)
await expect(
  connectedPage.locator('header').getByRole('heading', { name: 'Meeting UI' })
).toBeVisible();
```

---

### 4.2. `e2e/tests/calendar.spec.ts`

#### ❌ Тест 3: `can navigate to next month` — некорректный селектор кнопки

**Проблема**: `connectedPage.locator('button').filter({ hasText: '' }).last().click()`

После редизайна в header календаря добавлены кнопки `Light`, `System`, `Dark`, `☀/☾`. `.last()` теперь выберет кнопку переключения темы, а не кнопку навигации «вперёд».

**Исправление**: Использовать более точный селектор для кнопки навигации «вперёд»:

```typescript
// Кнопка "вперёд" — вторая кнопка с SVG в header
// Или использовать n-й button (вторая по счёту, после ←)
await connectedPage.locator('button').nth(1).click();
```

Или более надёжно — искать по структуре:

```typescript
// Кнопки навигации — первые 2 кнопки без текста в calendar header
// Навигация "вперёд" — вторая кнопка
const nextButton = connectedPage.locator('button').filter({ hasNotText: /.+/ }).nth(1);
await nextButton.click();
```

#### ⚠️ Тест 4: `can navigate to current month` — селектор первой кнопки

**Проблема**: `connectedPage.locator('button').first().click()` — первая кнопка всё ещё кнопка «назад» (←), но стоит убедиться, что кнопки темы не добавлены перед ней.

**Проверка**: В `Calendar.vue` порядок кнопок: `←`, `→`, ... → `first()` = `←` ✅ — работает.

Но для надёжности лучше уточнить:

```typescript
// Навигация "назад" — первая кнопка без текста
await connectedPage.locator('button').filter({ hasNotText: /.+/ }).first().click();
```

#### ⚠️ Тест 2: `shows events on the calendar` — потенциальная проблема

**Проблема**: Тест ищет `Ближайшие мероприятия` в month view. После редизайна эта секция перемещена в `<aside>` справа, но текст сохраняется.

Также fallback ищет текст `['Планёрка', 'Дедлайн', 'Код-ревью', 'Демо']` — если seed создаёт эти события, тест пройдёт.

**Рекомендация**: Проверить, что текст «Ближайшие мероприятия» присутствует в `CalendarMonth.vue`. ✅ Присутствует.

---

### 4.3. `e2e/tests/free-slots.spec.ts`

#### ❌ Тест 2: `month view shows green dots on days with free slots`

**Проблема**: `connectedPage.locator('.bg-green-500.rounded-full').count()`

Класс зелёных точек изменён на `bg-emerald-500`:

```html
<span class="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15"></span>
```

**Исправление**:

```typescript
const dotCount = await connectedPage.locator('.bg-emerald-500.rounded-full').count();
expect(dotCount).toBeGreaterThan(0);
```

#### ❌ Тест 3: `clicking a day with free slots opens day view showing slots`

**Проблема**: 
1. `connectedPage.locator('.bg-green-500').first()` — класс изменился
2. `connectedPage.locator('div.cursor-pointer:has(.bg-green-500)')` — класс изменился

**Исправление**:

```typescript
const dot = connectedPage.locator('.bg-emerald-500').first();
const dotCount = await dot.count();

if (dotCount > 0) {
  await expect(dot).toBeVisible({ timeout: 10000 });
  const cell = connectedPage.locator('div.cursor-pointer:has(.bg-emerald-500)').first();
  await cell.click();
}
// ... fallback
```

#### ❌ Тест 4: `week view shows free slots as green cells`

**Проблема**: `connectedPage.locator('.bg-green-50').count()`

Класс зелёных ячеек изменён на `bg-emerald-50`:

```html
class="... bg-emerald-50 hover:bg-emerald-100 ..."
```

**Исправление**:

```typescript
const greenElements = connectedPage.locator('.bg-emerald-50');
const count = await greenElements.count();
expect(count).toBeGreaterThan(0);
```

#### ⚠️ Тест 5: `day view via switcher shows slots when navigated to a date with them`

**Проблема**: `connectedPage.locator('text=/слотов|слот|свобод/')` — текст в day view header изменён.

Было: `🟢 N свободных / M всего (слоты по 30 мин)`
Стало: `● N свободных / M всего · слоты по 30 мин`

Регулярка `/слотов|слот|свобод/` — слово «свободных» присутствует, «слот» тоже. ✅ Должно работать.

Но также: `nextButton` селектор `connectedPage.locator('button').filter({ has: connectedPage.locator('svg') }).last()` — после добавления кнопок темы (которые тоже содержат SVG), `.last()` может выбрать кнопку темы.

**Исправление**:

```typescript
// Кнопка "вперёд" в calendar header
// Или использовать более точный селектор
const nextButton = connectedPage.locator('button').filter({ hasNotText: /.+/ }).nth(1);
```

---

### 4.4. `e2e/tests/settings.spec.ts`

#### ❌ Тест 7: `week view time slots match configured working hours`

**Проблема**: `connectedPage.locator('.w-14 .text-right').first().textContent()`

1. **Gutter width**: Week view теперь `w-14 sm:w-16`. На desktop viewport → `w-16`, так что `.w-14` не найдёт элемент.
2. **`text-right`**: В week view метки времени не имеют класса `text-right` (убран).

**Структура week view time labels**:
```html
<div class="w-14 flex-shrink-0 overflow-y-auto sm:w-16">
  <div class="h-6 pr-2 text-right text-[11px] leading-6 ...">10:00</div>
</div>
```

> **Примечание**: `text-right` есть на внутренних div-ах, но не на контейнере. Тест ищет `.w-14 .text-right` — вложенный селектор.

**Исправление**:

```typescript
// Найти первый элемент с меткой времени по тексту (HH:MM формат)
const firstTimeLabel = await connectedPage
  .locator('[class*="text-right"]')
  .first()
  .textContent();
expect(firstTimeLabel?.trim()).toBe(expectedFirstSlot);
```

Или более надёжно:

```typescript
// Искать по формату времени в gutter области
const firstTimeLabel = await connectedPage
  .locator(':text-matches(^\d{2}:\d{2}$)')
  .first()
  .textContent();
expect(firstTimeLabel?.trim()).toBe(expectedFirstSlot);
```

#### ❌ Тест 8: `changing settings updates calendar time range`

**Проблема**: Аналогично — `.w-14 .text-right` не найдёт элементы в week view.

**Исправление**: То же, что и в тесте 7.

#### ❌ Тест 10: `day view time slots match configured working hours`

**Проблема**: `connectedPage.locator('.w-16 .text-right').first().textContent()`

1. Day view gutter: `w-14 sm:w-16` — на desktop viewport класс `w-16` ✅
2. `text-right` есть внутри day view меток ✅

Но для надёжности:

**Исправление**:

```typescript
// Day view time labels
const firstTimeLabel = await connectedPage
  .locator(':text-matches(^\d{2}:\d{2}$)')
  .first()
  .textContent();
expect(firstTimeLabel?.trim()).toBe(expectedFirstSlot);
```

Или:

```typescript
// Day view gutter has w-14 sm:w-16
// Use a more general selector
const firstTimeLabel = await connectedPage
  .locator('[class*="pr-2"][class*="text-right"]')
  .first()
  .textContent();
```

---

### 4.5. `e2e/tests/availability-management.spec.ts`

#### ✅ API-тесты (8 тестов) — не зависят от UI

Все API-тесты работают через axios и не зависят от верстки. Ожидаемые типы данных (`daysOfWeek`, `startDate` и т.д.) уже адаптированы в коде тестов (`.map(Number)`, `.startsWith()`).

#### ⚠️ UI-тест 1: `Admin can access slots management page`

**Проблема**: Тест ищет кнопки табов по регуляркам `/Регулярные окна/`, `/Отпуска/`, `/Исключения/`, `/Предпросмотр/`.

Эти тексты сохранились в `ManageSlotsView.vue`:
- `tabLabels: { schedules: 'Регулярные окна', vacations: 'Отпуска', exclusions: 'Исключения', preview: 'Предпросмотр' }`

✅ Работает без изменений.

#### ⚠️ UI-тест 2: `Admin can create a recurring schedule via UI`

**Проблема**: Кнопка «Добавить расписание» — текст сохранился ✅. Кнопки дней `Пн`, `Ср` — текст сохранился ✅. Поле «Начало» — текст сохранился ✅. Кнопка «Сохранить» — текст сохранился ✅.

✅ Работает без изменений.

#### ⚠️ UI-тест 3: `Admin can create a vacation period via UI`

Аналогично — кнопки `Отпуска`, `Добавить отпуск`, `Сохранить` — тексты сохранены ✅.

#### ❌ UI-тест 4: `Preview tab shows computed slots`

**Проблема**: `connectedPage.locator('.bg-green-50').count()`

Зелёные pill-ы слотов в предпросмотре используют `bg-green-50` (проверить в `ManageSlotsView.vue`). Если класс не был изменён — тест пройдёт. Если изменён на `bg-emerald-50` — нужен фикс.

**Проверка**: В `ManageSlotsView.vue` preview pills:
```html
:class="slot.excluded
  ? 'bg-red-50 text-red-700 border-red-200 line-through'
  : slot.booked
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-green-50 text-green-700 border-green-200'"
```

Если html-designer обновил и эти классы на `emerald-*`, то:

```typescript
const greenPills = connectedPage.locator('.bg-emerald-50');
// или более надёжно:
const greenPills = connectedPage.locator('[class*="bg-green-50"], [class*="bg-emerald-50"]');
```

---

### 4.6. `e2e/tests/calendar.spec.ts` — `Default view is week`

#### ⚠️ Тест: `calendar opens in week view by default`

**Проблема**: `connectedPage.getByText('Пн')` и `connectedPage.getByText('Вс')` — эти тексты есть в header week view. Но в день-вieu тоже могут быть заголовки с днями.

**Проверка**: В `CalendarWeek.vue` day names: `['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']` ✅.

Default view — `week` (из `script setup`). ✅

---

## 5. Сводная таблица исправлений

| Приоритет | Файл | Тест | Проблема | Исправление |
|-----------|------|------|----------|-------------|
| 🔴 Высокий | `free-slots.spec.ts` | `month view shows green dots` | `.bg-green-500` → `.bg-emerald-500` | Обновить CSS-селектор |
| 🔴 Высокий | `free-slots.spec.ts` | `clicking a day with free slots` | `.bg-green-500` → `.bg-emerald-500` | Обновить CSS-селектор |
| 🔴 Высокий | `free-slots.spec.ts` | `week view shows free slots` | `.bg-green-50` → `.bg-emerald-50` | Обновить CSS-селектор |
| 🔴 Высокий | `settings.spec.ts` | `week view time slots match` | `.w-14 .text-right` не работает | Использовать `:text-matches(^\d{2}:\d{2}$)` |
| 🔴 Высокий | `settings.spec.ts` | `changing settings updates calendar` | `.w-14 .text-right` не работает | То же |
| 🔴 Высокий | `settings.spec.ts` | `day view time slots match` | `.w-16 .text-right` → responsive | Обновить селектор |
| 🟡 Средний | `auth.spec.ts` | `shows login page` | Strict mode / locator | Уточнить локейтор на `Вход в админ-панель` |
| 🟡 Средний | `calendar.spec.ts` | `can navigate to next month` | `.last()` выбирает кнопку темы | Уточнить селектор кнопки «вперёд» |
| 🟡 Средний | `free-slots.spec.ts` | `day view via switcher` | `.last()` для next button | Уточнить селектор |
| 🟢 Низкий | `availability-management.spec.ts` | `Preview tab shows computed slots` | `.bg-green-50` возможно → `.bg-emerald-50` | Проверить и обновить |

---

## 6. Алгоритм работы

### Шаг 1: Запуск тестов

```bash
npm run test:e2e
```

Запустить все тесты и собрать полный список упавших тестов.

### Шаг 2: Исправление по приоритетам

Исправлять тесты от 🔴 Высокого к 🟢 Низкому. После каждой группы — запуск тестов для проверки.

### Шаг 3: Общие рекомендации по селекторам

1. **CSS-классы Tailwind — хрупкие селекторы**. При редизайне они меняются.
   - ❌ `locator('.bg-green-50')` — ломается при смене палитры
   - ✅ `locator('[title*="Свободно"]')` — по tooltip
   - ✅ `locator(':text-matches(^\d{2}:\d{2}$)')` — по формату текста
   - ✅ `getByRole('button', { name: 'Месяц' })` — по роли и тексту

2. **Позиционные селекторы (`first()`, `last()`, `nth()`)** — хрупкие при добавлении кнопок.
   - ❌ `locator('button').last()` — ломается при добавлении кнопок темы
   - ✅ `locator('button').filter({ hasNotText: /.+/ }).nth(1)` — по отсутствию текста
   - ✅ `getByRole('button', { name: 'Сегодня' })` — по тексту кнопки

3. **Текстовые селекторы** — самые надёжные.
   - ✅ `getByText('Сохранить')` — если текст не меняется
   - ✅ `getByRole('heading', { name: 'Настройки' })` — по роли и тексту

### Шаг 4: Финальная проверка

После всех исправлений:
1. `npm run test:e2e` — все тесты должны пройти
2. При необходимости увеличить `timeout` или добавить `waitForTimeout` для асинхронной загрузки данных

---

## 7. Что НЕ менять в тестах

- **API-логика** — все запросы через axios работают без изменений
- **Последовательность тестов** — `test.describe.serial` сохранён
- **Исходные данные** — `clearAvailabilityData()`, `ensureSchedule()` не трогать
- **Базовые URL** — `BASE_URL`, `API_URL` не менять
