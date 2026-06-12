# E2E Testing Structure

## Описание

Playwright e2e тесты через Chrome CDP. Фикстуты `connectedBrowser` и `connectedPage` подключаются к реальному браузеру. Один тестовый файл: `basic.spec.ts` — вход в админку, создание пользователя, проверка публичной статистики.

## Ключевые файлы

| Файл | Роль |
|------|------|
| `e2e/playwright.config.ts` | Workers=1, chromium-cdp project |
| `playwright.config.mts` (root) | Global config, loads env |
| `e2e/fixtures.ts` | `connectedBrowser`, `connectedPage` fixtures |
| `e2e/global-setup.ts` | CDP check + DB seed + admin create |
| `e2e/tests/basic.spec.ts` | Basic flow tests |

## Тестовые сценарии

### basic.spec.ts

1. **Login to admin panel** — navigate to `/login`, fill form, submit, verify redirect to `/admin/users`
2. **Create user** — fill create form, submit, verify user in table
3. **Check public user count** — navigate to `/`, verify user count displayed

## Запуск

```bash
npm run test:e2e                    # all tests
npm run test:e2e -- basic.spec.ts   # one file
npm run test:e2e:ui                 # UI mode
```

## Common issues

1. **`baseURL` ignored with CDP**: always use full URLs
2. **CDP connection lost**: restart Chrome or tests
3. **DB seeding**: global-setup seeds admin only if DB is empty
