import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { ReminderEntity } from '../reminders/entities/reminder.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface DeleteUserResult {
  deletedUserId: number;
  deletedRemindersCount: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(ReminderEntity)
    private readonly remindersRepo: Repository<ReminderEntity>,
  ) {}

  async findAll(): Promise<Omit<UserEntity, 'passwordHash'>[]> {
    const users = await this.usersRepo.find({ order: { id: 'ASC' } });
    return users.map(({ passwordHash: _, ...user }) => user);
  }

  async findOne(id: number): Promise<Omit<UserEntity, 'passwordHash'> | null> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) return null;
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findByLogin(login: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { login } });
  }

  async create(dto: CreateUserDto): Promise<Omit<UserEntity, 'passwordHash'>> {
    const exists = await this.usersRepo.findOne({ where: { login: dto.login } });
    if (exists) {
      throw new ConflictException(`Пользователь "${dto.login}" уже существует`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      login: dto.login,
      passwordHash,
      role: dto.role ?? 'user',
    });
    await this.usersRepo.save(user);

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async update(id: number, dto: UpdateUserDto): Promise<Omit<UserEntity, 'passwordHash'> | null> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Пользователь #${id} не найден`);
    }

    // Cannot change own role
    if (dto.role && dto.role !== user.role) {
      user.role = dto.role;
    }
    if (dto.login) {
      const alreadyExists = await this.usersRepo.findOne({ where: { login: dto.login } });
      if (alreadyExists && alreadyExists.id !== id) {
        throw new ConflictException(`Пользователь "${dto.login}" уже существует`);
      }
      user.login = dto.login;
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.usersRepo.save(user);
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async remove(id: number, currentUserId: number): Promise<DeleteUserResult> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Пользователь #${id} не найден`);
    }

    // Cannot delete self
    if (id === currentUserId) {
      throw new BadRequestException('Нельзя удалить свой собственный аккаунт');
    }

    // Cannot delete the last admin
    if (user.role === 'admin') {
      const adminCount = await this.usersRepo.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        throw new BadRequestException('Нельзя удалить последнего администратора');
      }
    }

    // Count reminders before deletion (for the response — actual deletion is handled by DB CASCADE)
    const deletedRemindersCount = await this.remindersRepo.count({ where: { userId: id } });

    await this.usersRepo.delete(id);

    this.logger.log(
      `User #${id} (${user.login}) deleted by user #${currentUserId}; cascaded ${deletedRemindersCount} reminder(s)`,
    );

    return { deletedUserId: id, deletedRemindersCount };
  }

  async count(): Promise<{ total: number; adminCount: number }> {
    const total = await this.usersRepo.count();
    const adminCount = await this.usersRepo.count({ where: { role: 'admin' } });
    return { total, adminCount };
  }

  /** Find user by login for JWT validation */
  async validateByLogin(login: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { login } });
  }

  /** Change password for a user by ID */
  async changePassword(id: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Пользователь #${id} не найден`);
    }
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Неверный текущий пароль');
    }
    await this.usersRepo.update(id, { passwordHash: await bcrypt.hash(newPassword, 10) });
  }
}
