import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

const ROLES = [
  'Administrador',
  'Asesor de Servicio',
  'Técnico Mecánico',
] as const;

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsString()
  @MinLength(2)
  apellido: string;

  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn(ROLES)
  rol: (typeof ROLES)[number];
}
