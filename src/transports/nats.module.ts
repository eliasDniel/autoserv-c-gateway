import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from '../config/envs';
import { NATS_SERVICE } from '../config/service';

const natsClient = ClientsModule.register([
  {
    name: NATS_SERVICE,
    transport: Transport.NATS,
    options: { servers: envs.natsServers },
  },
]);

@Module({
  imports: [natsClient],
  exports: [natsClient],
})
export class NatsModule {}
