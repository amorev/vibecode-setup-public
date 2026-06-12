# Testing Guide

## Обзор

Проект использует только **E2E-тесты** (Playwright). Unit- и integration-тестов нет.

| Тип | Фреймворк | Расположение | Статус |
|-----|-----------|-------------|--------|
| E2E | Playwright | `e2e/tests/` | ✅ Работает |
| Unit | — | — | ❌ Нет |
| Integration | — | — | ❌ Нет |

## Запуск тестов

Все E2E-тесты запускаются последовательно: `workers=1`. Тесты используют общую БД.

```bash
# 1. Убедитесь что приложение запущено
npm run dev:backend:log    # :3000
npm run dev:frontend:log   # :5173

# 2. Запустите тесты (headless режим)
npm run test:e2e

# Один файл
npm run test:e2e -- e2e/tests/basic.spec.ts
```

> **Примечание**: для headless-режима Chrome не нужен. Playwright запускает браузер автоматически.

## Структура тестов

```
e2e/
├── playwright.config.ts      # E2E config: workers=1, headless chromium
├── global-setup.ts           # Backend check + admin password normalization
└── tests/
    └── basic.spec.ts         # Вход → создание пользователя → проверка статистики
```

## Как писать новые тесты

```typescript
// e2e/tests/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import axios from 'axios';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api';

test.describe('My Feature', () => {
  test('does something', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/`);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  });
});
```

### Правила

1. Импортируйте `{ test, expect }` из `@playwright/test` напрямую
2. Используйте `{ page }` fixture — Playwright управляет браузером автоматически
3. Используйте полные URL (не относительные пути)
4. Не используйте `waitForTimeout()` — используйте `expect().toBeVisible()`
5. Для API-вызовов используйте `axios` напрямую (не через `page.evaluate()`)

## CDP режим (опционально)

Для запуска тестов в реальном браузере (не headless):

```bash
# 1. Запустите Chrome с CDP
chrome.exe --remote-debugging-port=9222    # Windows
google-chrome --remote-debugging-port=9222 # Linux

# 2. Запустите тесты в CDP-режиме
E2E_BROWSER_MODE=cdp npm run test:e2e
```

## Docker E2E

```bash
# 1. Запустите приложение
cd docker && docker compose up -d

# 2. Запустите Chrome на хосте с CDP
chrome.exe --remote-debugging-port=9222

# 3. Запустите тесты в Docker
cd docker && docker compose -f docker-compose.e2e.yml up e2e
# Playwright UI: http://localhost:8080
```

## Чек-лист перед коммитом

- [ ] Все тесты проходят: `npm run test:e2e`
- [ ] Новые функции покрыты тестами
- [ ] Тесты используют `@playwright/test` напрямую
- [ ] Тесты используют полные URL
- [ ] Нет `waitForTimeout()` — только `expect().toBeVisible()`
