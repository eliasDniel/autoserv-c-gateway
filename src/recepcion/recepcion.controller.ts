import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { NATS_SERVICE } from '../config/service';
import {
  CambiarEstadoDto,
  GuardarRecepcionDto,
} from './dto/guardar-recepcion.dto';

@Controller()
export class RecepcionController {
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  @Get('recepcion')
  listar() {
    return firstValueFrom(this.client.send('core.recepcion.listar', {}));
  }

  @Post('recepcion')
  guardar(@Body() dto: GuardarRecepcionDto, @Req() req: { user: { sub: number } }) {
    const user = req.user;
    return firstValueFrom(
      this.client.send('core.recepcion.guardar', {
        ...dto,
        idAsesor: user.sub,
      }),
    );
  }

  @Patch('ordenes/:numero/estado')
  cambiarEstado(
    @Param('numero') numero: string,
    @Body() dto: CambiarEstadoDto,
    @Req() req: { user: { sub: number } },
  ) {
    const user = req.user;
    return firstValueFrom(
      this.client.send('core.orden.estado', {
        numeroOs: numero,
        estado: dto.estado,
        idUsuario: user.sub,
      }),
    );
  }
}
