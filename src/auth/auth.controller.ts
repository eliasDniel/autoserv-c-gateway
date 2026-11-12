import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NATS_SERVICE } from '../config/service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('auth')
export class AuthController {
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginUserDto) {
    return firstValueFrom(this.client.send('auth.login', dto));
  }

  @Get('users')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  listUsers() {
    return firstValueFrom(this.client.send('auth.user.list', {}));
  }

  @Post('users')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  createUser(@Body() dto: CreateUserDto) {
    return firstValueFrom(this.client.send('auth.user.create', dto));
  }

  @Patch('users/:id')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return firstValueFrom(
      this.client.send('auth.user.update', { id: Number(id), ...dto }),
    );
  }
}
