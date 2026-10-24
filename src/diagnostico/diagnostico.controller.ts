import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { NATS_SERVICE } from '../config/service';
import { DiagnosticarDto } from './dto/diagnosticar.dto';

@Controller()
export class DiagnosticoController {
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  @Post('diagnostico')
  diagnosticar(@Body() dto: DiagnosticarDto) {
    return firstValueFrom(this.client.send('ia.diagnostico', dto));
  }
}
