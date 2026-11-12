import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  apellido?: string;

  @IsOptional()
  @IsIn(['Administrador', 'Asesor de Servicio', 'Técnico Mecánico'])
  rol?: 'Administrador' | 'Asesor de Servicio' | 'Técnico Mecánico';

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
