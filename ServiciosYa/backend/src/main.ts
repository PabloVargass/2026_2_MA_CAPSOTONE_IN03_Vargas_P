import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { corsOrigin } from './cors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detrás de un proxy HTTPS (despliegue), el límite de intentos debe usar la IP real del cliente.
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

  // La app nativa no envía Origin; CORS solo afecta a navegadores.
  app.enableCors({ origin: corsOrigin(process.env) });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
