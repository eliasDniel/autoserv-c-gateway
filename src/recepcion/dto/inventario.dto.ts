import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

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
  @IsOptional()
  @IsString()
  codigo?: string;

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

export class RepuestoCsvFilaDto {
  @IsString()
  @MinLength(1)
  codigo: string;

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

export class ImportarRepuestosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepuestoCsvFilaDto)
  filas: RepuestoCsvFilaDto[];
}
