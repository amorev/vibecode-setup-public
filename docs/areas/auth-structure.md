# Auth Structure

## Описание

JWT авторизация через `passport-jwt`. Сущность `User` хранит login + bcrypt hash пароля + роль. Токен expires в 24 часа. Guard `JwtAuthGuard` защищает admin-only маршруты. Декоратор `@Public()` открывает отдельные маршруты без авторизации.

## Ключевые файлы

| Файл | Роль |
|------|------|
| `apps/backend/src/auth/auth.service.ts` | validateLogin, validateJwtPayload, changePassword |
| `apps/backend/src/auth/auth.controller.ts` | POST /login, GET /me, PATCH /password |
| `apps/backend/src/auth/jwt.strategy.ts` | Passport JWT strategy |
| `apps/backend/src/auth/jwt-auth.guard.ts` | @UseGuards(JwtAuthGuard), respects @Public() |
| `apps/backend/src/auth/public.decorator.ts` | @Public() — отключает guard для маршрута |
| `apps/backend/src/auth/dto/login.dto.ts` | Login DTO (login, password) |
| `apps/backend/src/auth/dto/change-password.dto.ts` | Change password DTO (currentPassword, newPassword) |

## JWT Flow

```
1. POST /api/auth/login { login, password }
   → { access_token }  (expires: 24h)

2. Frontend stores token in localStorage('auth_token')

3. Every protected request: Authorization: Bearer <token>

4. JwtAuthGuard extracts sub (user.id) from token, validates user exists
```

## Password Hashing

- `bcrypt` with saltRounds = 10
- `passwordHash` stored in `user` table, never returned in API responses

## Public Routes

Маршруты с `@Public()` декоратором доступны без авторизации:
- `POST /api/auth/login`
- `GET /api/users/count`

## Seeding

При `OnModuleInit` в `AppModule`: если в таблице `user` нет записей — создаётся первый админ из `ADMIN_LOGIN` / `ADMIN_PASSWORD` env vars.

## Common issues

1. **JWT-secret default**: `dev-secret-change-me` — change in production
2. **Token expired (24h)**: re-login
3. **Wrong password**: bcrypt.compare returns false, 401 Unauthorized
