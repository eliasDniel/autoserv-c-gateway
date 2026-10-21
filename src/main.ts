import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RpcCustomExceptionFilter } from './common/exceptions/rpc-custom-exception.filter';
import { envs } from './config/envs';

async function bootstrap() {
  const logger = new Logger('Client Gateway');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new RpcCustomExceptionFilter());
  app.enableCors({
    origin: [
      'http://localhost:8443',
      'http://127.0.0.1:8443',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(envs.port);
  logger.log(`Client Gateway corriendo en el puerto ${envs.port}`);
}

void bootstrap();
