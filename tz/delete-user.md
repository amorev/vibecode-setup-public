# ТЗ: Удаление пользователя через админ-панель

## Цель

Дать администратору возможность удалять пользователей из админ-панели. При удалении:
- пользователь и все его напоминания удаляются из БД,
- нельзя удалить самого себя,
- нельзя удалить последнего админа в системе,
- обычные пользователи (`role: 'user'`) не имеют доступа к API удаления.

## Текущее состояние (что уже есть)

| Компонент | Статус | Файл |
|-----------|--------|------|
| `DELETE /api/users/:id` эндпоинт | ✅ есть | `apps/backend/src/users/users.controller.ts` |
| `UsersService.remove()` | ✅ есть, но без защит | `apps/backend/src/users/users.service.ts` |
| Каскад `reminder.user → user` | ✅ `onDelete: 'CASCADE'` | `apps/backend/src/reminders/entities/reminder.entity.ts` |
| `deleteUser()` API-функция | ✅ есть | `apps/frontend/src/api/users.ts` |
| Кнопка «Удалить» + `confirm()` | ✅ есть, нативный диалог | `apps/frontend/src/views/admin/ManageUsersView.vue` |
| Скрытие кнопки для себя в UI | ✅ `isOwn()` | `apps/frontend/src/views/admin/ManageUsersView.vue` |
| Role-guard на `/api/users/*` | ❌ нет (только JWT) | — |
| Защита от самоудаления на backend | ❌ нет | — |
| Защита «последний админ» | ❌ нет | — |
| Модальный диалог подтверждения | ❌ `window.confirm()` | — |
| E2E-тест удаления | ❌ нет | `e2e/tests/basic.spec.ts` |

## Что нужно сделать

### 1. Backend: `apps/backend/src/users/users.service.ts`

Переписать `remove(id, currentUserId)`:

1. Найти пользователя по `id`. Если не найден → `throw new NotFoundException(...)`.
2. Если `id === currentUserId` → `throw new BadRequestException('Нельзя удалить свой собственный аккаунт')`.
3. Если у удаляемого пользователя `role === 'admin'`:
   - посчитать `adminCount = usersRepo.count({ where: { role: 'admin' } })`,
   - если `adminCount <= 1` → `throw new BadRequestException('Нельзя удалить последнего администратора')`.
4. Посчитать количество напоминаний пользователя (`remindersRepo.count({ where: { userId: id } })`) **для отчёта**, удаление произойдёт автоматически по `CASCADE`.
5. Выполнить `usersRepo.delete(id)`.
6. Вернуть `{ deletedUserId: id, deletedRemindersCount: number }` — для UI.

Изменения в сигнатуре: `remove(id: number, currentUserId: number)` — добавить второй аргумент.

### 2. Backend: `apps/backend/src/users/users.controller.ts`

- В `remove()` пробросить `req.user.id` из `@Request()`:
  ```ts
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.usersService.remove(parseInt(id, 10), req.user.id);
  }
  ```
- (Опционально, если делать role-guard отдельным шагом — см. п. 3.) Сейчас задача — **только удаление**, role-guard вынести в отдельную задачу, но в этом ТЗ задокументировать как обязательное условие (без него удаление небезопасно).

### 3. Backend: `apps/backend/src/users/users.service.ts` — добавить `countReminders`

Приватный хелпер для подсчёта напоминаний пользователя. Альтернатива — инжектировать `RemindersService`, но чтобы не создавать циклическую зависимость `Users ↔ Reminders`, использовать прямой `@InjectRepository(ReminderEntity)` в `UsersService`.

> **Проверить**: импорт `ReminderEntity` не должен ломать `UsersModule` (напоминания уже зарегистрированы в TypeORM через `ReminderModule` и доступны глобально через `TypeOrmModule.forFeature`).

### 4. Frontend: `apps/frontend/src/views/admin/ManageUsersView.vue`

Заменить нативный `confirm()` на собственный модальный диалог (Tailwind-стиль, как `surface-card`).

Что должно быть в модалке:
- Заголовок: «Удалить пользователя?»
- Тело:
  - имя/логин,
  - сколько напоминаний будет удалено каскадом (предварительно запросить через `GET /api/reminders?showPast=true` от лица удаляемого пользователя? **Нет** — обычный админ не может читать чужие напоминания). Поэтому считаем на backend и возвращаем в ответе `DELETE`. **До удаления** показываем «будут удалены все напоминания пользователя», точное число — после.
- Кнопки: «Отмена», «Удалить» (красная).
- Состояние `deletingId` уже есть — использовать.
- Показывать inline-спиннер внутри кнопки «Удалить» во время запроса.

После успешного удаления:
- закрыть модалку,
- перезагрузить список пользователей,
- (опционально) toast-уведомление «Пользователь удалён вместе с N напоминаниями».

При ошибке (например, 400 «последний админ»):
- показать текст ошибки из `e.response?.data?.message` в модалке,
- не закрывать диалог, дать админу прочитать.

### 5. Frontend: `apps/frontend/src/api/users.ts`

Обновить тип `deleteUser` чтобы возвращал `DeleteUserResponse`:

```ts
export interface DeleteUserResponse {
  deletedUserId: number;
  deletedRemindersCount: number;
}

export const deleteUser = async (id: number): Promise<DeleteUserResponse> => {
  const response = await api.delete<DeleteUserResponse>(`/api/users/${id}`);
  return response.data;
};
```

### 6. Frontend: блокировка кнопки для себя

Уже сделано через `v-if="!isOwn(user)"`. Не трогать — оставить как есть (двойная защита: UI + backend).

### 7. Тесты

#### 7.1 E2E — `e2e/tests/basic.spec.ts` (или новый файл `e2e/tests/delete-user.spec.ts`)

Сценарий:
1. Логин админом.
2. Создать тестового пользователя `delete-target-<ts>`.
3. Убедиться, что он появился в таблице.
4. Нажать «Удалить» → подтвердить в модалке.
5. Дождаться исчезновения строки.
6. (Опционально) проверить, что `/api/users/count` уменьшился.

Дополнительный сценарий (негативный):
- Попытка удалить самого себя → кнопка скрыта в UI.
- (Через прямой API-запрос) попытка удалить единственного админа → 400.

#### 7.2 Backend (опционально)

Юнит-тесты на `UsersService.remove()`:
- удаление существующего пользователя,
- удаление несуществующего → `NotFoundException`,
- самоудаление → `BadRequestException`,
- удаление последнего админа → `BadRequestException`,
- удаление обычного пользователя, когда есть ещё админы → успех.

Тесты в проекте не настроены (нет jest/vitest конфига для backend), поэтому шаг опциональный — можно оставить на будущее.

## Структура изменений (сводка)

```
apps/backend/src/users/
  users.controller.ts            ← @Request() req в remove()
  users.service.ts               ← переписать remove(): self-check, last-admin, вернуть счётчик

apps/frontend/src/
  api/users.ts                   ← тип DeleteUserResponse
  views/admin/ManageUsersView.vue← модальный диалог, новая кнопка, обработка ошибок

e2e/tests/
  delete-user.spec.ts            ← новый файл (или дополнить basic.spec.ts)

docs/areas/
  backend-api-structure.md       ← обновить раздел Users: response для DELETE
  admin-panel.md                 ← описать модалку удаления
  reminders.md                   ← упомянуть каскадное удаление при удалении пользователя
```

## Порядок выполнения

1. Backend: `UsersService.remove()` + `UsersController.remove()`.
2. Backend: проверить руками через curl/Postman (см. ниже).
3. Frontend: обновить API-тип, переделать UI на модалку.
4. E2E-тест.
5. Обновить документацию.

## Ручная проверка (через curl)

```bash
# Логин
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"admin","password":"admin"}' | jq -r .access_token)

# Создать цель
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"login":"todelete","password":"pass1234","role":"user"}'

# Удалить (подставить свой id)
curl -X DELETE http://localhost:3000/api/users/2 \
  -H "Authorization: Bearer $TOKEN"

# Ожидаемый ответ: { "deletedUserId": 2, "deletedRemindersCount": 0 }

# Негативные кейсы:
# 1) Удалить самого себя:
curl -X DELETE http://localhost:3000/api/users/1 -H "Authorization: Bearer $TOKEN"
# → 400 "Нельзя удалить свой собственный аккаунт"

# 2) Удалить несуществующего:
curl -X DELETE http://localhost:3000/api/users/9999 -H "Authorization: Bearer $TOKEN"
# → 404 "Пользователь #9999 не найден"

# 3) Удалить последнего админа (когда admin один):
# → 400 "Нельзя удалить последнего администратора"
```

## Чек-лист для тестировщика

- [ ] Удаление обычного пользователя → 200, ответ содержит `deletedRemindersCount`.
- [ ] Удаление админа, когда есть ещё хотя бы один админ → 200.
- [ ] Удаление самого себя → 400, понятное сообщение.
- [ ] Удаление несуществующего id → 404.
- [ ] Удаление последнего (единственного) админа → 400.
- [ ] Удаление пользователя с напоминаниями → все его напоминания исчезли из БД (проверить через `GET /api/reminders` от лица нового тестового юзера — там их быть не должно).
- [ ] UI: кнопка «Удалить» не показывается для собственной строки.
- [ ] UI: модалка подтверждения показывает логин и предупреждение.
- [ ] UI: после удаления строка исчезает из таблицы без перезагрузки страницы.
- [ ] UI: при ошибке (например, попытке через прямой API) сообщение показывается в модалке.

## Зависимости и риски

- **Role-guard отсутствует.** Сейчас любой залогиненный пользователь может дернуть `DELETE /api/users/:id`. В рамках этой задачи мы защищаемся self-check'ом и last-admin, но полноценная безопасность требует отдельного `RolesGuard`. Задача упоминается в ТЗ как known gap, реализация — отдельной таской.
- **Циклические зависимости модулей.** `UsersService` уже импортирует `ReminderEntity` через репозиторий — ок. Если в будущем понадобится вызвать методы `RemindersService` из `UsersService`, делать через события (`@OnEvent`) или отдельный `CascadeService`, чтобы не плодить циклы.
- **SQLite vs PostgreSQL.** `onDelete: 'CASCADE'` поддерживается обеими БД, миграция не нужна (synchronize: true). Поведение идентично.
- **Транзакции.** Удаление пользователя + каскад — атомарно на уровне БД (один `DELETE FROM user WHERE id = ?`), отдельная транзакция не нужна.

## Открытые вопросы

1. Делать ли role-guard в рамках этой задачи или отдельной? **Рекомендация:** отдельной, но хотя бы зафиксировать в known issues.
2. Нужно ли подтверждение ввода логина для удаления (как в GitHub при удалении репозитория)? **Рекомендация:** нет, обычной модалки достаточно — пользователей мало.
3. Логировать ли удаление пользователя? **Рекомендация:** добавить `Logger.log()` в `UsersService.remove()` — бесплатно, помогает при аудите. В этом ТЗ не критично, можно отложить.