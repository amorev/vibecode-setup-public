import { IsString, IsDate, IsBoolean, IsArray, IsOptional, IsInt, Min, Max, ArrayMinSize } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UpdateReminderDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  scheduledAt?: Date;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  @ArrayMinSize(1)
  @IsOptional()
  @Transform(({ value }) => (value === null ? null : value ? value.map((v: unknown) => Number(v)) : value))
  weekdays?: number[] | null;
}
