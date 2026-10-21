import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { envs } from './config/envs';
import { HealthController } from './health/health.controller';
import { RecepcionModule } from './recepcion/recepcion.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: envs.jwtService,
    }),
    AuthModule,
    RecepcionModule,
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
