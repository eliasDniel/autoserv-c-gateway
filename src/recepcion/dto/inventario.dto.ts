import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class MoverInventarioDto {
  @IsString()
  @MinLength(1)
  codigo: string;

  @IsIn(['entrada', 'salida'])
  tipo: 'entrada' | 'salida';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsString()
  nota?: string;
}

export class CrearRepuestoDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio?: number;
}
