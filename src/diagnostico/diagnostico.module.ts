import { Module } from '@nestjs/common';
import { NatsModule } from '../transports/nats.module';
import { DiagnosticoController } from './diagnostico.controller';

@Module({
  imports: [NatsModule],
  controllers: [DiagnosticoController],
})
export class DiagnosticoModule {}
