import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginUserDto {
  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(8)
  password: string;
}
