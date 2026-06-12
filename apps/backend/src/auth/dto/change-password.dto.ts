import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(4, { message: 'Новый пароль должен содержать минимум 4 символа' })
  newPassword: string;
}
