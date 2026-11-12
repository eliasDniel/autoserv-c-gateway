import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NATS_SERVICE } from '../config/service';
import { GuardarCitaDto } from './dto/guardar-cita.dto';
import {
  CrearRepuestoDto,
  ImportarRepuestosDto,
  MoverInventarioDto,
} from './dto/inventario.dto';
import {
  CambiarEstadoDto,
  GuardarRecepcionDto,
} from './dto/guardar-recepcion.dto';
import {
  GuardarClienteDto,
  GuardarVehiculoDto,
} from './dto/clientes.dto';
import {
  GuardarServicioDto,
  ImportarServiciosDto,
} from './dto/servicios.dto';

type InventarioCore = {
  code: string;
  name: string;
  category: string;
  stock: number;
  min: number;
  max: number;
  price: number;
  rotation: string;
  demanda30: number;
  coberturaDias: number | null;
  sugerido: number;
  fuente?: string;
  serieDiaria?: number[];
  movimientos?: unknown[];
};

type ProyeccionDemanda = {
  codigo: string;
  demanda30: number;
  coberturaDias: number | null;
  sugerido: number;
  fuente: string;
};

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
  async listarInventario() {
    const items = await firstValueFrom(
      this.client.send<InventarioCore[]>('core.inventario.listar', {}),
    );

    const proyecciones = await firstValueFrom(
      this.client.send<{ proyecciones: ProyeccionDemanda[] }>('ia.demanda.predecir', {
        items: items.map((item) => ({
          codigo: item.code,
          serieDiaria: item.serieDiaria ?? [],
          stockActual: item.stock,
          stockMinimo: item.min,
        })),
      }).pipe(
        timeout(4000),
        catchError(() => of({ proyecciones: [] as ProyeccionDemanda[] })),
      ),
    );

    const porCodigo = new Map(
      (proyecciones.proyecciones ?? []).map((item) => [item.codigo, item]),
    );

    return items.map(({ serieDiaria: _serie, ...rest }) => {
      const proyeccion = porCodigo.get(rest.code);
      if (!proyeccion) {
        return { ...rest, fuente: rest.fuente ?? 'local' };
      }
      return {
        ...rest,
        demanda30: proyeccion.demanda30,
        coberturaDias: proyeccion.coberturaDias,
        sugerido: proyeccion.sugerido,
        fuente: proyeccion.fuente ?? 'stub',
      };
    });
  }

  @Post('inventario/movimiento')
  moverInventario(@Body() dto: MoverInventarioDto) {
    return firstValueFrom(this.client.send('core.inventario.mover', dto));
  }

  @Post('inventario')
  crearRepuesto(@Body() dto: CrearRepuestoDto) {
    return firstValueFrom(this.client.send('core.inventario.crear', dto));
  }

  @Delete('inventario/:codigo')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  eliminarRepuesto(@Param('codigo') codigo: string) {
    return firstValueFrom(this.client.send('core.inventario.eliminar', { codigo }));
  }

  @Post('inventario/importar')
  importarRepuestos(@Body() dto: ImportarRepuestosDto) {
    return firstValueFrom(this.client.send('core.inventario.importar', dto));
  }

  @Get('citas')
  listarCitas() {
    return firstValueFrom(this.client.send('core.cita.listar', {}));
  }

  @Get('citas/disponibilidad')
  horasLibres(@Query('fecha') fecha: string) {
    return firstValueFrom(this.client.send('core.cita.horasLibres', { fecha }));
  }

  @Post('citas')
  guardarCita(@Body() dto: GuardarCitaDto) {
    return firstValueFrom(this.client.send('core.cita.guardar', { ...dto, origen: dto.origen ?? 'web' }));
  }

  @Public()
  @Post('citas/publica')
  guardarCitaPublica(@Body() dto: GuardarCitaDto) {
    return firstValueFrom(
      this.client.send('core.cita.guardar', {
        ...dto,
        id: undefined,
        estado: 'pendiente',
        origen: 'web',
      }),
    );
  }

  @Post('clientes')
  guardarCliente(@Body() dto: GuardarClienteDto) {
    return firstValueFrom(this.client.send('core.cliente.guardar', dto));
  }

  @Delete('clientes/:id')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  eliminarCliente(@Param('id') id: string) {
    return firstValueFrom(this.client.send('core.cliente.eliminar', { id }));
  }

  @Post('vehiculos')
  guardarVehiculo(@Body() dto: GuardarVehiculoDto) {
    return firstValueFrom(this.client.send('core.vehiculo.guardar', dto));
  }

  @Delete('vehiculos/:id')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  eliminarVehiculo(@Param('id') id: string) {
    return firstValueFrom(this.client.send('core.vehiculo.eliminar', { id }));
  }

  @Post('clientes/:id/telegram-link')
  async crearVinculoTelegram(@Param('id') id: string) {
    const result = await firstValueFrom(
      this.client.send<{ token: string; expira: string; clienteId: number }>(
        'core.cliente.crearVinculoTelegram',
        { clienteId: Number(id) },
      ),
    );
    const user = process.env.TELEGRAM_BOT_USERNAME || '';
    const deepLink = user
      ? `https://t.me/${user.replace(/^@/, '')}?start=${result.token}`
      : result.token;
    return { ...result, deepLink, botUsername: user || null };
  }

  @Get('servicios')
  listarServicios() {
    return firstValueFrom(this.client.send('core.servicios.listar', {}));
  }

  @Post('servicios')
  guardarServicio(@Body() dto: GuardarServicioDto) {
    return firstValueFrom(this.client.send('core.servicios.guardar', dto));
  }

  @Post('servicios/importar')
  importarServicios(@Body() dto: ImportarServiciosDto) {
    return firstValueFrom(this.client.send('core.servicios.importar', dto));
  }

  @Delete('servicios/:codigo')
  @Roles('Administrador')
  @UseGuards(RolesGuard)
  eliminarServicio(@Param('codigo') codigo: string) {
    return firstValueFrom(this.client.send('core.servicios.eliminar', { codigo }));
  }
}
