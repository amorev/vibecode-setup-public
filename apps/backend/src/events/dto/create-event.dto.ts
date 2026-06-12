import { IsString, IsDate, IsUrl, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  description: string;

  @IsString()
  @IsUrl({ require_tld: false })
  link: string;

  @IsDate()
  @Type(() => Date)
  eventDate: Date;
}