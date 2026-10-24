import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class GuardarCitaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;

  @IsString()
  @MinLength(1)
  nombreCliente: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  placa?: string;

  @IsString()
  @MinLength(1)
  servicio: string;

  @IsString()
  @MinLength(8)
  fecha: string;

  @IsString()
  @MinLength(4)
  hora: string;

  @IsString()
  @MinLength(1)
  mecanico: string;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsString()
  estado?: string;
}
