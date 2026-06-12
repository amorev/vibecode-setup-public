import { IsString, IsDate, IsBoolean, IsArray, IsOptional, ArrayMinSize, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateReminderDto {
  @IsString()
  text: string;

  @IsDate()
  @Type(() => Date)
  scheduledAt: Date;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  @ArrayMinSize(1)
  @IsOptional()
  @Transform(({ value }) => (value ? value.map((v: unknown) => Number(v)) : value))
  weekdays?: number[];
}
