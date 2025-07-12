// backend/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express'; // Import json and urlencoded

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  const host = configService.get<string>('HOST', 'localhost');
  const port = configService.get<number>('PORT', 3000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://192.168.1.26:3001');

  // FIX: Increase the payload size limit to allow for file uploads.
  // This needs to be set before the app listens for requests.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  app.enableCors({
    origin: frontendUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(port, host);
  
  console.log(`Backend is running on: ${await app.getUrl()}`);
  console.log(`Accepting requests from: ${frontendUrl}`);
}
bootstrap();
