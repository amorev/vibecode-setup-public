import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateLogin(dto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.usersService.findByLogin(dto.login);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const payload = { sub: user.id, login: user.login };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateJwtPayload(payload: { sub: number; login: string }) {
    return this.usersService.findByLogin(payload.login);
  }

  async changePassword(userId: number | string, dto: ChangePasswordDto): Promise<void> {
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    await this.usersService.changePassword(id, dto.currentPassword, dto.newPassword);
  }
}
