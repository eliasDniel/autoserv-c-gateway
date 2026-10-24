import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NATS_SERVICE } from '../config/service';
import { GuardarCitaDto } from './dto/guardar-cita.dto';
import { CrearRepuestoDto, MoverInventarioDto } from './dto/inventario.dto';
import {
  CambiarEstadoDto,
  GuardarRecepcionDto,
} from './dto/guardar-recepcion.dto';

@Controller()
export class RecepcionController {
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  @Post('datos/reiniciar')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  reiniciar() {
    return firstValueFrom(this.client.send('core.datos.reiniciar', {}));
  }

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
        pago: dto.pago,
      }),
    );
  }

  @Delete('ordenes/:numero')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  eliminar(@Param('numero') numero: string) {
    return firstValueFrom(this.client.send('core.orden.eliminar', { numeroOs: numero }));
  }

  @Get('inventario')
  listarInventario() {
    return firstValueFrom(this.client.send('core.inventario.listar', {}));
  }

  @Post('inventario/movimiento')
  moverInventario(@Body() dto: MoverInventarioDto) {
    return firstValueFrom(this.client.send('core.inventario.mover', dto));
  }

  @Post('inventario')
  crearRepuesto(@Body() dto: CrearRepuestoDto) {
    return firstValueFrom(this.client.send('core.inventario.crear', dto));
  }

  @Get('citas')
  listarCitas() {
    return firstValueFrom(this.client.send('core.cita.listar', {}));
  }

  @Post('citas')
  guardarCita(@Body() dto: GuardarCitaDto) {
    return firstValueFrom(this.client.send('core.cita.guardar', dto));
  }

  @Public()
  @Post('citas/publica')
  guardarCitaPublica(@Body() dto: GuardarCitaDto) {
    return firstValueFrom(this.client.send('core.cita.guardar', { ...dto, id: undefined, estado: 'pendiente' }));
  }
}
