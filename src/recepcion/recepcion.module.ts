import { Module } from '@nestjs/common';
import { NatsModule } from '../transports/nats.module';
import { RecepcionController } from './recepcion.controller';

@Module({
  imports: [NatsModule],
  controllers: [RecepcionController],
})
export class RecepcionModule {}
