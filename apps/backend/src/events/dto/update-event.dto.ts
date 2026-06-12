import { IsString, IsDate, IsUrl, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsUrl({ require_tld: false })
  @IsOptional()
  link?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  eventDate?: Date;
}