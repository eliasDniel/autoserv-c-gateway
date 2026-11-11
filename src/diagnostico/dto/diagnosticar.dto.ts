import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class DiagnosticarDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  texto: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  kilometraje?: number;
}
