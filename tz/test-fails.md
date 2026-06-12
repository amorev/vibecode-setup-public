# E2E Test Failures Report

**Date:** 2026-05-27
**Total:** 72 tests — 48 passed, 10 failed, 14 skipped (dependent on failures)

---

## 1. Admin Password Change UI (8 failures)

**File:** `e2e/tests/admin-password.spec.ts` (lines 265–433)

**All 8 tests in `test.describe.serial('Admin Password Change UI')` fail with the same root cause:**

| # | Test | Line | Error |
|---|------|------|-------|
| 1 | shows "Смена пароля" section with "Изменить пароль" button | 265 | `Test timeout of 30000ms exceeded` — waiting for `getByRole('button', { name: 'Изменить пароль' })` — page closed |
| 2 | opening the form reveals three password fields | 278 | `Test timeout of 30000ms exceeded` — waiting for `getByRole('button', { name: 'Изменить пароль' })` — page closed |
| 3 | rejects password change with wrong current password | 297 | `Test timeout of 30000ms exceeded` — same |
| 4 | rejects password change with mismatched passwords | 315 | `Test timeout of 30000ms exceeded` — same |
| 5 | rejects password change with empty fields | 333 | `Test timeout of 30000ms exceeded` — same |
| 6 | rejects new password shorter than 4 characters | 349 | `Test timeout of 30000ms exceeded` — same |
| 7 | successfully changes password, shows success, and restores | 367 | `Test timeout of 30000ms exceeded` — same |
| 8 | cancel button closes the form without saving | 426 | `Test timeout of 30000ms exceeded` — same |

**Common flow:** Login → navigate to `/#/admin/settings` → wait `networkidle` → find button "Изменить пароль"

**Root cause:** The page never shows the button. Likely the `loadSettings()` API call (GET `/api/events/settings`) fails or the page stays in loading state.

**Suspect 1 — API failure:** If `GET /api/events/settings` returns an error, the Vue component shows a loading spinner indefinitely (line 108-110 of `AppSettingsView.vue`: `v-if="loading"`). The button is inside `v-else` block, so it's never rendered.

**Suspect 2 — Auth guard / redirect:** If the admin's auth token is invalid or the user is redirected away from `/admin/settings`, the page shows something else entirely.

**Suspect 3 — Page timing:** `waitForLoadState('networkidle')` may fire before the settings API completes if there's a slow initial request.

**Diagnostic steps:**
1. Check if `GET http://localhost:3000/api/events/settings` returns 200 during test execution
2. Check if the `settings` table has a row with `id=1` after `db:reset` (the `ensureSettings()` method in `events.service.ts` creates it on first call, but if the table doesn't exist, it fails)
3. Check browser console for frontend errors

**Fix direction:** 
- Verify the `/api/events/settings` endpoint works (the settings.spec.ts tests pass, so it should work)
- Check if the Vue component is rendering correctly — add a `waitForSelector` for the heading before looking for the button
- Consider waiting for the loading spinner to disappear before interacting

---

## 2. Auth — Logout doesn't clear token (1 failure)

**File:** `e2e/tests/auth.spec.ts` (line 143)

**Test:** `logout clears token and redirects to login`

**Error:**
```
expect(received).toBeNull()
Received: "eyJhbGciOiJIUzI1NiIs..."
```

**Flow:** Login → click "Выйти" button → wait 1.5s → check `localStorage.getItem('auth_token')` is null

**Root cause:** The `logout()` function in `useAuth.ts` (line 29-33) calls `localStorage.removeItem('auth_token')`, but the token persists after the button click.

**Suspect 1 — Button not found / not clicked:** The test uses `getByRole('button', { name: 'Выйти' })` to find the logout button. The `AdminLayout.vue` (line 44) has a button with text "Выйти" but it uses `@click="logout"` and has `btn-secondary` class. If the button is inside a component that re-renders or if the role detection fails, the click might not fire.

**Suspect 2 — Token set after logout:** If something re-authenticates after logout (e.g., a background API call that refreshes the token), the token could be re-set.

**Suspect 3 — Different localStorage context:** With CDP-connected browser, the localStorage might be shared across tabs, and a different tab might have set the token.

**Fix direction:**
- Verify the logout button is actually being clicked (add `waitForSelector` or `isVisible` check before click)
- Add `waitForTimeout` after click and check if token changes
- Check if there's a race condition with `fetchUser()` being called after logout

---

## 3. Notifications — No default log channel (1 failure)

**File:** `e2e/tests/notifications.spec.ts` (line 62)

**Test:** `GET /notifications/channels returns default log channel`

**Error:**
```
expect(received).toBeDefined()
Received: undefined
```

**Flow:** Login via API → GET `/notifications/channels` → find channel with `type === 'log' && enabled === true`

**Root cause:** The `ensureDefaultChannels()` method in `notification.service.ts` is called in `NotificationsModule.onModuleInit()` (line 26-27 of `notifications.module.ts`), but it's not being called or failing silently.

**Suspect 1 — `ensureDefaultChannels()` not called:** The `NotificationsModule` implements `OnModuleInit`, which should fire on startup. If the module isn't loaded or if there's an error during init, the default channel won't be created.

**Suspect 2 — DB table doesn't exist:** After `db:reset` (which was just fixed to include `notification_channel` table), the table exists but the seeding hasn't run yet.

**Suspect 3 — Timing issue:** The e2e global setup checks `GET /api/events/settings` to verify backend is ready, but doesn't wait for `ensureDefaultChannels()` to complete.

**Fix direction:**
- Check if `ensureDefaultChannels()` is actually being called (add logging)
- Verify the `notification_channel` table exists and is empty after reset
- Consider calling `POST /notifications/channels` with type 'log' in global setup instead of relying on `onModuleInit`

---

## Summary of Root Causes

| Category | Tests Affected | Likely Cause |
|----------|---------------|--------------|
| DB schema | Notifications, Settings (previously) | `reset-db.ts` missing entities (FIXED) |
| Frontend rendering | Admin Password UI (8 tests) | Settings page not loading / button not found |
| Auth flow | Logout (1 test) | Token not cleared from localStorage |
| Backend seeding | Notifications (1 test) | Default log channel not created on startup |

## Files to Check

| File | Purpose |
|------|---------|
| `apps/backend/src/database/reset-db.ts` | DB reset script — was missing 5 entities (FIXED) |
| `apps/frontend/src/views/admin/AppSettingsView.vue` | Settings page with password change form |
| `apps/frontend/src/composables/useAuth.ts` | Auth composable with logout function |
| `apps/frontend/src/layouts/AdminLayout.vue` | Admin layout with logout button |
| `apps/backend/src/notifications/notification.service.ts` | `ensureDefaultChannels()` method |
| `apps/backend/src/notifications/notifications.module.ts` | `OnModuleInit` hook |
| `e2e/tests/admin-password.spec.ts` | Failing admin password UI tests |
| `e2e/tests/auth.spec.ts` | Failing logout test |
| `e2e/tests/notifications.spec.ts` | Failing notification tests |

## Reproduction Steps

1. Start backend: `npm run dev:backend:log`
2. Start frontend: `npm run dev:frontend:log`
3. Run tests: `npm run test:e2e`

The 10 failing tests are deterministic — they fail every run with the same errors.
