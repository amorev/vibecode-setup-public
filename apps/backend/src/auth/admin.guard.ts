import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

/**
 * Guard that allows access only to authenticated users with role 'admin'.
 * Must be used together with JwtAuthGuard (which populates req.user).
 *
 * Note: req.user from JwtStrategy only contains { id, login } (no role),
 * so we look up the user record to read the current role from the DB.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Требуется авторизация');
    }

    const user = await this.usersService.findOne(userId);
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Требуются права администратора');
    }

    return true;
  }
}