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
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
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
