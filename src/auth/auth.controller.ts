import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NATS_SERVICE } from '../config/service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginUserDto) {
    return firstValueFrom(this.client.send('auth.login', dto));
  }

  @Post('users')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  createUser(@Body() dto: CreateUserDto) {
    return firstValueFrom(this.client.send('auth.user.create', dto));
  }
}
