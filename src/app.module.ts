import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { envs } from './config/envs';
import { DiagnosticoModule } from './diagnostico/diagnostico.module';
import { HealthController } from './health/health.controller';
import { RecepcionModule } from './recepcion/recepcion.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    JwtModule.register({
      global: true,
      secret: envs.jwtService,
    }),
    AuthModule,
    RecepcionModule,
    DiagnosticoModule,
    TelegramModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
