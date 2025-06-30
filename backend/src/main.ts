// backend/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LogLevel } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // --- ENABLE CORS ---
  // This tells our backend to accept requests from our frontend.
  app.enableCors({
    origin: 'http://localhost:3001', // The origin of your frontend app
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
