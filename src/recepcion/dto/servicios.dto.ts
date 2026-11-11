import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class GuardarServicioDto {
  @IsOptional()
  @IsString()
  codigo?: string;

  @IsString()
  @MinLength(2)
  nombre: string;

  @IsString()
  @MinLength(1)
  tiempo: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number;
}

export class ServicioCsvFilaDto {
  @IsString()
  @MinLength(1)
  codigo: string;

  @IsString()
  @MinLength(2)
  nombre: string;

  @IsString()
  @MinLength(1)
  tiempo: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number;
}

export class ImportarServiciosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicioCsvFilaDto)
  filas: ServicioCsvFilaDto[];
}
