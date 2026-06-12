import { IsString, MinLength, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsString()
  login: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsEnum(['admin', 'user'])
  role?: 'admin' | 'user';
}
